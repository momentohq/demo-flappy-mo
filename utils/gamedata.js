const gravity = (value) => {
  switch (value) {
    case .3:
      return "low";
    case .5:
      return "high";
    default:
      return "normal";
  }
};

const jump = (value) => {
  if (value <= -9) {
    return "high";
  } else if (value >= -7) {
    return "low";
  } else {
    return "normal";
  }
};

const speed = (value) => {
  switch (value) {
    case -1:
      return "slow";
    case -2:
      return "normal";
    case -3:
      return "fast";
    case -4:
      return "very fast";
    default:
      return "normal";
  }
};

const pipes = (value) => {
  if (value < 75) {
    return "very close";
  } else if (value < 125) {
    return "close";
  } else if (value < 175) {
    return "normal";
  } else {
    return "far";
  }
};

export const GameProps = {
  gravity,
  jump,
  speed,
  pipes
};
