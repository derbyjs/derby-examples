class EditForm {
  init(model) {
    this.people = model.scope('people');
    this.person = model.ref('person', model.scope('_page.person'));
    this.nameError = model.at('nameError');
  }

  done() {
    if (!this.person.get('name')) {
      var checkName = this.person.on('change', 'name', (value) => {
        if (!value) return;
        this.nameError.del();
        this.model.removeListener('change', checkName);
      });
      this.nameError.set(true);
      this.nameInput.focus();
      return;
    }

    if (!this.person.get('id')) {
      this.people.add(this.person.get());
      // Wait for all model changes to go through before going to the next page, mainly because
      // in non-single-page-app mode (basically IE < 10) we want changes to save to the server before leaving the page
      this.model.whenNothingPending(() => {
        this.app.history.push('/people');
      });
    } else {
      this.app.history.push('/people');
    }
  }

  cancel() {
    this.app.history.back();
  }

  deletePerson() {
    // Update model without emitting events so that the page doesn't update
    this.person.silent().del();
    // Wait for all model changes to go through before going back, mainly because
    // in non-single-page-app mode (basically IE < 10) we want changes to save to the server before leaving the page
    this.model.whenNothingPending(() => {
      this.app.history.back();
    });
  }
};

EditForm.view = {
  file: __dirname + '/edit',
  dependencies: [
    require('./chrome')
  ]
};
module.exports = EditForm;
