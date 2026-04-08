import { makePage } from '@keystatic/astro/ui';
import config from '../../../keystatic.config';

export const KeystaticApp = makePage(config, { routerKind: 'hash' });
