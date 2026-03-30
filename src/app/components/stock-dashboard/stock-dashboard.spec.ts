import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockDashboard } from './stock-dashboard';

describe('StockDashboard', () => {
  let component: StockDashboard;
  let fixture: ComponentFixture<StockDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});