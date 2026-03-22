import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Integration: AuthController ↔ AuthService (with Prisma mock)', () => {
  let app: INestApplication;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('IT-AUTH-01: POST /auth/register → 201 + token + user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1',
      email: 'max@test.com',
      password: 'pw',
      displayName: 'Max',
      username: '@max',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'max@test.com', password: 'pw', displayName: 'Max' })
      .expect(201);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      id: 'u1',
      email: 'max@test.com',
      displayName: 'Max',
      username: '@max',
    });

    // Spy/Mock демонстрація: перевіряємо взаємодію компонента з залежністю
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'max@test.com' },
    });
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('IT-AUTH-02: POST /auth/login with missing user → 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no@user.com', password: 'pw' })
      .expect(401);

    // optional: перевірка повідомлення
    expect(String(res.body.message)).toContain('Invalid credentials');
  });
});
