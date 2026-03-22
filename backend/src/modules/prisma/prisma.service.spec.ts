describe('PrismaService (unit)', () => {
  test('throws if DATABASE_URL missing', () => {
    const old = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    jest.resetModules();
    const { PrismaService } = require('./prisma.service');

    expect(() => new PrismaService()).toThrow(
      'DATABASE_URL is missing in backend/.env',
    );

    if (old) process.env.DATABASE_URL = old;
  });
});
