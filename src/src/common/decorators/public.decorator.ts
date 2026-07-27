import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without a valid admin JWT (login, setup, webhooks, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
