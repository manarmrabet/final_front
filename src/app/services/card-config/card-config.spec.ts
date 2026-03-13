import { TestBed } from '@angular/core/testing';

import { CardConfig } from './card-config';

describe('CardConfig', () => {
  let service: CardConfig;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CardConfig);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
