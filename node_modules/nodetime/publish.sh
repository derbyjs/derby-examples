TAG=$1
MSG=$2

echo "pushing and publishing $TAG ($MSG)"

git add .
git commit -am "$MSG"
git tag -a "$TAG" -m "$MSG"
git push origin master
git push origin $TAG
npm publish
