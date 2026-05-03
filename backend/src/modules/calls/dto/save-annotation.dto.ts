import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

/**
 * Request body for persisting an annotation snapshot for a channel.
 *
 * The payload is intentionally untyped on the server side — the canvas state
 * shape is owned by the frontend and may evolve without backend deploys.
 */
export class SaveAnnotationDto {
  @ApiProperty({
    description: 'Opaque annotation snapshot (JSON object)',
    example: { strokes: [], version: 1 },
  })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiProperty({
    description: 'Optional client-generated id used for de-duplication',
    required: false,
  })
  @IsOptional()
  clientId?: string;
}
