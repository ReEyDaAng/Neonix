import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { PrismaService } from "../../modules/prisma/prisma.service";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string, displayName?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException("Email already registered");

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        displayName: displayName?.trim() || "User",
        username: "@" + email.split("@")[0]
      }
    });

    return this.sign(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) throw new UnauthorizedException("Invalid credentials");
    return this.sign(user);
  }

  async me(token: string) {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("User not found");
    return this.publicUser(user);
  }

  private sign(user: { id: string; email: string; displayName: string; username: string }) {
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
    return { token, user: this.publicUser(user) };
  }

  private publicUser(user: { id: string; email: string; displayName: string; username: string }) {
    return { id: user.id, email: user.email, displayName: user.displayName, username: user.username };
  }
}
