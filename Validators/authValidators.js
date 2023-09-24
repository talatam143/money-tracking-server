const passwordValidator = (value) => {
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(value);
};

const mobileNumberValidator = (value) => {
  const mobileNumberRegex = /^[0-9]{10}$/;
  return mobileNumberRegex.test(value);
};

const emailValidator = (value) => {
  const emailValidatorRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailValidatorRegex.test(value);
};

const mpinValidator = (value) => {
  const mpinValidatorRegex = /^[0-9]{4}$/;
  return mpinValidatorRegex.test(value);
};

export {
  passwordValidator,
  mobileNumberValidator,
  emailValidator,
  mpinValidator,
};
