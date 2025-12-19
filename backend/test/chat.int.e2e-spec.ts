import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";

describe("Integration: ChatController ↔ ChatService (with Prisma mock)", () => {
  let app: INestApplication;

  const prismaMock = {
    room: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    channel: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
    message: {
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
    Object.values(prismaMock).forEach((m: any) =>
      Object.values(m).forEach((fn: any) => fn.mockReset())
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("IT-CHAT-01: GET /rooms seeds when DB empty", async () => {
    prismaMock.room.count.mockResolvedValue(0);

    // seed calls
    prismaMock.room.create
      .mockResolvedValueOnce({ id: "r1" })
      .mockResolvedValueOnce({ id: "r2" });

    prismaMock.channel.createMany.mockResolvedValue({ count: 5 });
    prismaMock.channel.findFirst.mockResolvedValue({ id: "c_general" });
    prismaMock.message.create.mockResolvedValue({ id: "m1" });

    // result of listRooms()
    prismaMock.room.findMany.mockResolvedValue([
      { id: "r1", name: "Neonix — Main" },
      { id: "r2", name: "Study Session" },
    ]);

    const res = await request(app.getHttpServer()).get("/rooms").expect(200);

    expect(res.body).toHaveLength(2);
    expect(prismaMock.room.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.channel.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.message.create).toHaveBeenCalledTimes(1);
  });

  it("IT-CHAT-02: GET /rooms does NOT seed when rooms exist", async () => {
    prismaMock.room.count.mockResolvedValue(1);
    prismaMock.room.findMany.mockResolvedValue([{ id: "rX", name: "Already exists" }]);

    const res = await request(app.getHttpServer()).get("/rooms").expect(200);

    expect(res.body).toHaveLength(1);
    expect(prismaMock.room.create).not.toHaveBeenCalled();
    expect(prismaMock.channel.createMany).not.toHaveBeenCalled();
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });
});
