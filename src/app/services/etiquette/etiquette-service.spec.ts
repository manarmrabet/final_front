import { TestBed } from '@angular/core/testing';

import { EtiquetteService } from './etiquette-service';

describe('EtiquetteService', () => {
  let service: EtiquetteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EtiquetteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
