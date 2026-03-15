import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormDraftService } from './form-draft';

interface RegisteredForm {
  key:     string;
  form:    FormGroup;
  context?: string;
}

/**
 * USAGE dans un composant formulaire :
 *
 *   ngOnInit() {
 *     this.formRegistry.register('menu-create', this.form);
 *     const draft = this.draftService.restore('menu-create');
 *     if (draft) { this.form.patchValue(draft.data as any); }
 *   }
 *   ngOnDestroy() {
 *     this.formRegistry.unregister('menu-create');
 *   }
 *   onSubmit() {
 *     // ... après succès :
 *     this.draftService.clear('menu-create');
 *   }
 */
@Injectable({ providedIn: 'root' })
export class ActiveFormRegistryService {
  private readonly draftService = inject(FormDraftService);
  private readonly registry     = new Map<string, RegisteredForm>();

  register(key: string, form: FormGroup, context?: string): void {
    this.registry.set(key, { key, form, context });
  }

  unregister(key: string): void {
    this.registry.delete(key);
  }

  /** Appelé par l'intercepteur avant redirect — persiste tous les formulaires actifs */
  saveAll(): void {
    this.registry.forEach(({ key, form, context }) => {
      const values  = form.getRawValue();
      const hasData = Object.values(values).some(v => v !== null && v !== '' && v !== undefined);
      if (hasData) {
        this.draftService.save(key, values, context ?? window.location.pathname);
        console.info(`[FormRegistry] Brouillon sauvegardé: ${key}`);
      }
    });
  }
}