describe('AuthService (unit)', () => {
  let AuthService: any;
  let BadRequestException: any;
  let UnauthorizedException: any;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetModules(); // ок, залишаємо
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();

    // ✅ важливо: require після resetModules
    ({
      BadRequestException,
      UnauthorizedException,
    } = require('@nestjs/common'));
    ({ AuthService } = require('./auth.service'));
  });

  test('register: throws if email already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    const svc = new AuthService(prisma as any);

    await expect(svc.register('a@b.com', '123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.register('a@b.com', '123')).rejects.toMatchObject({
      message: 'Email already registered',
    });
  });

  test('login: throws on invalid credentials', async () => {
    const svc = new AuthService(prisma as any);

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.login('a@b.com', '123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      password: 'wrong',
      displayName: 'A',
      username: '@a',
    });

    await expect(svc.login('a@b.com', '123')).rejects.toMatchObject({
      message: 'Invalid credentials',
    });
  });
});
