// src/app/directives/feather-icon.directive.ts
// ─────────────────────────────────────────────
// Directive pour les icônes Feather stockées en base de données
// Usage dans le HTML : <i appFeather="home"></i>
// Ou avec la classe CSS Feather directement : <i class="feather icon-home"></i>
// (les classes CSS Feather fonctionnent si tu as importé feather.css)

import { Directive, ElementRef, Input, OnChanges, OnInit } from '@angular/core';

@Directive({
  selector: '[appFeather]',
  standalone: true
})
export class FeatherIconDirective implements OnInit, OnChanges {
  @Input('appFeather') iconName = '';

  constructor(private el: ElementRef) {}

  ngOnInit()    { this.render(); }
  ngOnChanges() { this.render(); }

  private render(): void {
    if (!this.iconName) return;
    // Feather Icons expose un objet global window.feather si chargé via CDN
    // Avec npm install feather-icons, importer et appeler replace()
    const feather = (window as any)['feather'];
    if (feather && feather.icons[this.iconName]) {
      this.el.nativeElement.innerHTML = feather.icons[this.iconName].toSvg({
        width: 18, height: 18, 'stroke-width': 1.5
      });
    }
  }
}