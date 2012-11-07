var derby = require('derby'), // possibly don't need, we're just using uuid() for now
    everyauth = require('everyauth');

// We keep these around, but they're set in the middleware function
var model,
    req,
    sess;

module.exports.middleware = function(expressApp, store) {
    setupQueries(store);
    setupAccessControl(store);
    setupEveryauth();
    expressApp.use(function(request, res, next) {
        req = request;
        model = req.getModel();
        sess = model.session;
        newUser();
        return next();
    });
    return everyauth.middleware();
};

setupQueries = function(store) {
    store.query.expose('users', 'withId', function(id) {
        return this.byId(id);
    });
    store.query.expose('users', 'withEveryauth', function(provider, id, password) {
        if (password == null) {
            password = null;
        }
        console.log({
            withEveryauth: {
                provider: provider,
                id: id,
                password: password
            }
        });
        if (password) {
            return this.where("auth." + provider + ".id").equals(id).where("auth." + provider + ".password").equals(password);
        } else {
            return this.where("auth." + provider + ".id").equals(id);
        }
    });
    return store.queryAccess('users', 'withEveryauth', function(methodArgs) {
        var accept;
        accept = arguments[arguments.length - 1];
        return accept(true); // for now
    });
};

setupAccessControl = function(store) {
    store.accessControl = true;

    //Callback(signatures(here(have(variable(length, eg(callback(captures..., next)))))));
    //Is(using(arguments[n](the(correct(way(to(handle(typeof this !== "undefined" && this !== null))))))));

    store.readPathAccess('users.*', function() { // captures, next) ->
        var captures, next;
        if (!(this.session && this.session.userId)) {
            return; // https://github.com/codeparty/racer/issues/37
        }
        captures = arguments[0];
        next = arguments[arguments.length - 1];
        return next(captures === this.session.userId);
    });
    return store.writeAccess('*', 'users.*', function() { // captures, value, next) ->
        var captures, next, pathArray;
        if (!(this.session && this.session.userId)) {
            return;
        }
        captures = arguments[0];
        next = arguments[arguments.length - 1];
        pathArray = captures.split('.');
        return next(pathArray[0] === this.session.userId);
    });
};

/**
 * -------- New user --------
 * They get to play around before creating a new account.
 */
function newUser() {
    if (!sess.userId) {
        sess.userId = derby.uuid();
        return model.set("users." + sess.userId, {
            auth: {}
        });
    }
};

// Working on a hack to get password.js to play nicely with everyauth
function setupExpress(expressApp) {
    return expressApp.engine('html', (function() {
        var cache;
        cache = {};
        return function(path, options, cb) {
            var str;
            try {
                str = cache[path] || (cache[path] = fs.readFileSync(path, 'utf8'));
                return cb(null, str);
            } catch (err) {
                return cb(err);
            }
        };
    })());
};

function setupEveryauth() {
    everyauth.debug = true;
    everyauth.everymodule.findUserById(function(id, callback) {
        // will never be called, can't fetch user from database at this point on the server
        // see https://github.com/codeparty/racer/issues/39. Handled in app/auth.coffee for now
        return callback(null, null);
    });

    // Facebook Authentication Logic
    // -----------------------------
    everyauth.facebook
        .appId(process.env.FACEBOOK_KEY)
        .appSecret(process.env.FACEBOOK_SECRET)
        .findOrCreateUser(function(session, accessToken, accessTokenExtra, fbUserMetadata) {
            var q;

            // Put it in the session for later use
            session.auth || (session.auth = {});
            session.auth.facebook = fbUserMetadata.id;
            q = model.query('users').withEveryauth('facebook', fbUserMetadata.id);
            model.fetch(q, function(err, user) {
                var id, u;
                console.log({
                    err: err,
                    fbUserMetadata: fbUserMetadata
                });
                id = user && (u = user.get()) && u.length > 0 && u[0].id;
                // # Has user been tied to facebook account already?
                if (id && id !== session.userId) {
                    return session.userId = id;
                // # Else tie user to their facebook account
                } else {
                    model.setNull("users." + session.userId + ".auth", {
                        'facebook': {}
                    });
                    return model.set("users." + session.userId + ".auth.facebook", fbUserMetadata);
                }
            });
        return fbUserMetadata;
    }).redirectPath("/");

    // Login Authentication Logic
    // -----------------------------
    everyauth.password
        .loginWith('email')
        .getLoginPath('/login')
        .postLoginPath('/login')
        .authenticate(function(login, password) {
            var errors, user;
            errors = [];
            if (!login) {
                errors.push("Missing login");
            }
            if (!password) {
                errors.push("Missing password");
            }
            if (errors.length) {
                return errors;
            }
            user = usersByLogin[login];
            if (!user) {
                return ["Login failed"];
            }
            if (user.password !== password) {
                return ["Login failed"];
            }
            return user;
        }).getRegisterPath("/register").postRegisterPath("/register").validateRegistration(function(newUserAttrs, errors) {
            var login, q;
            login = newUserAttrs.login;
            q = model.query('users').withEveryauth('password', login);
            return model.fetch(q, function(err, user) {
                var u;
                console.log({
                    err: err,
                    user: user
                });
                if (user && (u = user.get()) && u.length > 0 && u[0].id) {
                    errors.push("Login already taken");
                }
                return errors;
            });
        }).registerUser(function(newUserAttrs) {
            var login;
            login = newUserAttrs[this.loginKey()];
            return model.set("users." + sess.userId + ".auth.password", newUserAttrs);
        })
    .loginSuccessRedirect("/")
    .registerSuccessRedirect("/");


    everyauth.everymodule.handleLogout(function(req, res) {
        if (req.session.auth && req.session.auth.facebook) {
            req.session.auth.facebook = void 0;
        }
        req.session.userId = void 0;
        req.logout(); // The logout method is added for you by everyauth, too
        return this.redirect(res, this.logoutRedirectPath());
    });
};
