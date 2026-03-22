describe('ChatService (unit)', () => {
  let ChatService: any;

  const prisma = {
    room: {
      count: jest.fn(),
      create: jest.fn(),
    },
    channel: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetModules();
    Object.values(prisma).forEach((m: any) =>
      Object.values(m).forEach((fn: any) => fn.mockReset()),
    );

    ({ ChatService } = require('./chat.service'));
  });

  test('ensureSeed: does nothing when roomsCount > 0', async () => {
    prisma.room.count.mockResolvedValue(1);

    const svc = new ChatService(prisma as any);
    await svc.ensureSeed();

    expect(prisma.room.create).not.toHaveBeenCalled();
    expect(prisma.channel.createMany).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  test('ensureSeed: seeds rooms/channels/message when empty', async () => {
    prisma.room.count.mockResolvedValue(0);

    prisma.room.create
      .mockResolvedValueOnce({ id: 'r1' })
      .mockResolvedValueOnce({ id: 'r2' });

    prisma.channel.createMany.mockResolvedValue({ count: 5 });
    prisma.channel.findFirst.mockResolvedValue({ id: 'c_general' });
    prisma.message.create.mockResolvedValue({ id: 'm1' });

    const svc = new ChatService(prisma as any);
    await svc.ensureSeed();

    expect(prisma.room.create).toHaveBeenCalledTimes(2);
    expect(prisma.channel.createMany).toHaveBeenCalledTimes(1);

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: 'r1',
          channelId: 'c_general',
          who: expect.any(String),
          me: expect.any(Boolean),
        }),
      }),
    );
  });
});
