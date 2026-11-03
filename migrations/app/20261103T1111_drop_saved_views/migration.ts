#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/61afe3ffbbbe6842c629550003404982fb79f698f88a35dac7328c3ef16d27b6/contract';
import startContract from '../../snapshots/61afe3ffbbbe6842c629550003404982fb79f698f88a35dac7328c3ef16d27b6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f001ece94fea7f773796b8e6b6efc71a8b9c28c74c14e431761920fd58b2063a/contract';
import endContract from '../../snapshots/f001ece94fea7f773796b8e6b6efc71a8b9c28c74c14e431761920fd58b2063a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropTable({ schema: 'public', table: 'saved_view' })];
  }
}

MigrationCLI.run(import.meta.url, M);
