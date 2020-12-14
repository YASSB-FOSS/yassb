function capitalizeFirstLetter(str) {
  return (str && typeof str === 'string') ? (str.charAt(0).toUpperCase() + str.slice(1)) : "";
}

const subpackage = new RegExp("packages/([^/]+)/");
module.exports = function customMappingFunction(explicit, implicit, path, reflection, context) {
  if (implicit === 'src')
    return '- YASSB';

  implicit = implicit.replace('src\\', '');
  arrFullRelativaPath = implicit.split('\\');
  const finalArr = [];
  arrFullRelativaPath.forEach(pathFragment => {
    let newFileName = '';
    const arrFragment = pathFragment.split('-');
    arrFragment.forEach(word => {
      newFileName += capitalizeFirstLetter(word);
    });
    finalArr.push(newFileName);
  });
  return finalArr.join('\\');
}
