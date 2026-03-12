import { TestBed } from '@angular/core/testing';

import {RoleMapping } from './role-mapping';

describe('RoleMapping', () => {
  let service: RoleMapping;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleMapping);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
