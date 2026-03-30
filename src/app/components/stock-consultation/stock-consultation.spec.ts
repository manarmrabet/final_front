import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockConsultation } from './stock-consultation';

describe('StockConsultation', () => {
  let component: StockConsultation;
  let fixture: ComponentFixture<StockConsultation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockConsultation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockConsultation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});