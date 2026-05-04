import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionArchive } from './production-archive';

describe('ProductionArchive', () => {
  let component: ProductionArchive;
  let fixture: ComponentFixture<ProductionArchive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionArchive]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionArchive);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
