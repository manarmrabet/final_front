import { TestBed } from '@angular/core/testing';

import { DashboardNotification } from './dashboard-notification';

describe('DashboardNotification', () => {
  let service: DashboardNotification;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardNotification);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
