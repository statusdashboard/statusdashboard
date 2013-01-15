exports.execute = function(min, max, value) {
  if (min && max && value >= min && value < max) {
    return true;
  } else if ( (min && value >= min) || (max && value < max) ) {
    return true;
  }
  return false;
};
