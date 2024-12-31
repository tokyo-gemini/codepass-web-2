export function getTagType(value) {
  const types = ['', 'success', 'warning', 'danger', 'info'];
  return types[value] || '';
}
