import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema()
export class Alert {
  @Prop({ index: true, required: true })
  alertId: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: false })
  nThumbsUp?: number;

  @Prop({ required: false })
  city?: string;

  @Prop({ required: true })
  reportRating: number;

  @Prop({ required: true })
  reportByMunicipalityUser: string;

  @Prop({ required: true })
  reliability: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  fromNodeId: number;

  @Prop({ required: true })
  speed: number;

  @Prop({ required: true })
  reportMood: number; //

  @Prop({ required: false })
  subtype?: string;

  @Prop({ required: false })
  street?: string;

  @Prop({ required: false })
  additionalInfo?: string; //

  @Prop({ required: true })
  toNodeId: number;

  @Prop({ required: true })
  id: string;

  @Prop({ required: false })
  nComments?: number;

  @Prop({ required: true })
  inscale: boolean;

  @Prop({ required: true })
  confidence: number;

  @Prop({ required: true })
  roadType: number;

  @Prop({ required: true })
  magvar: number; //

  @Prop({ required: true })
  wazeData: string; //

  @Prop({
    required: true,
    type: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  })
  location: {
    x: number;
    y: number;
  };

  @Prop({ required: true })
  pubMillis: number;

  @Prop({ required: false })
  reportBy?: string;

  @Prop({ required: false })
  provider?: string;

  @Prop({ required: false })
  providerId?: string; //

  @Prop({ required: false })
  reportDescription?: string; //

  @Prop({ required: false })
  nearBy?: string; //
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
