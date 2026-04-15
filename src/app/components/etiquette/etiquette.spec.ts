import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Etiquette } from './etiquette';

describe('Etiquette', () => {
  let component: Etiquette;
  let fixture: ComponentFixture<Etiquette>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Etiquette]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Etiquette);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
