import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionLog } from './production-log';

describe('ProductionLog', () => {
  let component: ProductionLog;
  let fixture: ComponentFixture<ProductionLog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionLog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionLog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
