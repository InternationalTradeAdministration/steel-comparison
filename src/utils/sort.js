
export function propComparator(prop, order) {
  if (order === 'asc') {
    return function(a, b) {
      if (a[prop] < b[prop])
        return -1;
      if (a[prop] > b[prop])
        return 1;
      return 0;
    };
  }

  else if (order === 'desc') {
    return function(a, b) {
      if (a[prop] > b[prop])
        return -1;
      if (a[prop] < b[prop])
        return 1;
      return 0;
    };
  }
}