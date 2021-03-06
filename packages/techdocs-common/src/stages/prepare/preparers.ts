/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Logger } from 'winston';
import { UrlReader } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { DirectoryPreparer, CommonGitPreparer, UrlPreparer } from '.';
import { PreparerBase, RemoteProtocol, PreparerBuilder } from './types';
import { parseReferenceAnnotation } from '../../helpers';

type factoryOptions = {
  logger: Logger;
  reader: UrlReader;
};

export class Preparers implements PreparerBuilder {
  private preparerMap = new Map<RemoteProtocol, PreparerBase>();

  static async fromConfig(
    // @ts-ignore
    // Config not used now, but will be used in urlPreparer when it starts using
    // @backstage/integration to get the tokens for providers.
    config: Config,
    { logger, reader }: factoryOptions,
  ): Promise<PreparerBuilder> {
    const preparers = new Preparers();

    const directoryPreparer = new DirectoryPreparer(logger);
    preparers.register('dir', directoryPreparer);

    const commonGitPreparer = new CommonGitPreparer(logger);
    preparers.register('github', commonGitPreparer);
    preparers.register('gitlab', commonGitPreparer);
    preparers.register('azure/api', commonGitPreparer);

    const urlPreparer = new UrlPreparer(reader, logger);
    preparers.register('url', urlPreparer);

    return preparers;
  }

  register(protocol: RemoteProtocol, preparer: PreparerBase) {
    this.preparerMap.set(protocol, preparer);
  }

  get(entity: Entity): PreparerBase {
    const { type } = parseReferenceAnnotation(
      'backstage.io/techdocs-ref',
      entity,
    );
    const preparer = this.preparerMap.get(type);

    if (!preparer) {
      throw new Error(`No preparer registered for type: "${type}"`);
    }

    return preparer;
  }
}
