const AuthService = {
  currentUser: null,
  login: jest.fn(async () => null),
  logout: jest.fn(async () => null),
  silentRestore: jest.fn(async () => null),
};

module.exports = {
  __esModule: true,
  AuthService,
};
