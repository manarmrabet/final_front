import { Pipe, PipeTransform } from '@angular/core';

/**
 * LucideIconPipe — standalone, pur (pure: true par défaut)
 *
 * ✅ Pure pipe : Angular ne l'appelle QUE si la valeur d'entrée change
 *    → élimine les recalculs à chaque cycle de détection (cause de lenteur)
 * ✅ Cache interne Map<string, string> : chaque nom n'est résolu qu'une seule fois
 * ✅ Retourne toujours un nom valide → jamais d'erreur Lucide silencieuse
 *
 * Usage : [name]="item.icon | lucideIcon"
 */
@Pipe({
  name: 'lucideIcon',
  standalone: true,
  pure: true   // ← ✅ CLEF PERFORMANCE : recalcul uniquement si l'input change
})
export class LucideIconPipe implements PipeTransform {

  // ── Cache de résolution : évite de recalculer le même nom ──────────────────
  private static readonly cache = new Map<string, string>();

  // ── Alias : noms courants → noms Lucide valides ────────────────────────────
  private static readonly ALIASES: Record<string, string> = {
    // Téléphone
    'phone-call':           'phone',
    'phone-incoming':       'phone-incoming',
    'phone-outgoing':       'phone-outgoing',
    'phone-missed':         'phone-missed',
    'phone-off':            'phone-off',

    // Alignement (n'existent pas tels quels dans Lucide)
    'align-center':         'align-center-horizontal',
    'align-left':           'align-start-horizontal',
    'align-right':          'align-end-horizontal',

    // Layout / navigation
    'layout-dashboard':     'layout-dashboard',
    'dashboard':            'layout-dashboard',

    // Raccourcis sans tiret
    'settings2':            'settings-2',
    'barchart':             'bar-chart',
    'barchart2':            'bar-chart-2',
    'piechart':             'pie-chart',
    'linechart':            'line-chart',
    'shieldcheck':          'shield-check',
    'usercheck':            'user-check',
    'userplus':             'user-plus',
    'userminus':            'user-minus',
    'filetext':             'file-text',
    'fileplus':             'file-plus',
    'folderplus':           'folder-plus',
    'folderopen':           'folder-open',
    'creditcard':           'credit-card',
    'shoppingcart':         'shopping-cart',
    'dollarsign':           'dollar-sign',
    'trendingup':           'trending-up',
    'trendingdown':         'trending-down',
    'alertcircle':          'alert-circle',
    'refreshcw':            'refresh-cw',
    'trash':                'trash-2',
    'trashcan':             'trash-2',
  };

  // ── Noms Lucide valides connus ─────────────────────────────────────────────
  private static readonly KNOWN = new Set<string>([
    'activity','airplay','alert-circle','alert-octagon','alert-triangle',
    'align-center-horizontal','align-center-vertical','align-end-horizontal',
    'align-end-vertical','align-justify','align-start-horizontal',
    'align-start-vertical','anchor','aperture','archive','archive-restore',
    'arrow-big-down','arrow-big-left','arrow-big-right','arrow-big-up',
    'arrow-down','arrow-down-circle','arrow-down-left','arrow-down-right',
    'arrow-left','arrow-left-circle','arrow-right','arrow-right-circle',
    'arrow-up','arrow-up-circle','arrow-up-left','arrow-up-right',
    'at-sign','award','axe','badge','badge-check','ban',
    'bar-chart','bar-chart-2','battery','bell','bell-off','bell-ring',
    'bike','binary','bluetooth','bold','book','book-open','bookmark',
    'box','briefcase','building','calculator','calendar','calendar-check',
    'calendar-clock','calendar-days','calendar-minus','calendar-plus',
    'calendar-range','camera','check','check-circle','check-square',
    'chevron-down','chevron-left','chevron-right','chevron-up',
    'circle','clipboard','clipboard-check','clipboard-copy','clipboard-list',
    'clock','cloud','code','code-2','coins','columns','command','compass',
    'contact','container','copy','cpu','credit-card','crop',
    'database','delete','dollar-sign','download','download-cloud',
    'edit','edit-2','edit-3','eye','eye-off','feather',
    'file','file-minus','file-plus','file-text','filter','fingerprint',
    'flag','folder','folder-open','folder-plus','forklift',
    'gauge','globe','grid','hard-drive','hash','heart',
    'help-circle','home','hourglass','image','image-off','inbox','info',
    'key','keyboard','layers','layout','layout-dashboard','layout-grid',
    'line-chart','link','list','lock','log-in','log-out',
    'mail','map','maximize','menu','message-circle','message-square',
    'minimize','minus','monitor','moon','more-horizontal','more-vertical',
    'navigation','package','panel-left','pencil','percent',
    'phone','phone-call','phone-incoming','phone-missed','phone-off','phone-outgoing',
    'pie-chart','piggy-bank','pin','play','plus','printer',
    'receipt','refresh-cw','save','scissors','search','search-x','send',
    'server','settings','settings-2','share','shield','shield-alert',
    'shield-check','shield-off','ship','shopping-cart','sidebar',
    'sigma','sliders','sliders-horizontal','star','store',
    'sun','sunrise','sunset','switch-camera','table','tag',
    'timer','toggle-left','tool','trash','trash-2',
    'trending-down','trending-up','truck','unlock','upload',
    'user','user-check','user-cog','user-minus','user-plus','user-x',
    'users','wallet','warehouse','watch','wrench',
    'x','x-circle','zap','zoom-in','zoom-out',
  ]);

  transform(icon: string | undefined | null): string {
    const raw = icon?.trim();

    // Entrée vide → fallback immédiat
    if (!raw) return 'circle';

    // ── Résultat déjà en cache ? → retour instantané ──────────────────────────
    if (LucideIconPipe.cache.has(raw)) {
      return LucideIconPipe.cache.get(raw)!;
    }

    const lower  = raw.toLowerCase();
    let   result = 'circle'; // fallback par défaut

    if (LucideIconPipe.ALIASES[lower]) {
      // 1. Alias direct
      result = LucideIconPipe.ALIASES[lower];
    } else if (LucideIconPipe.KNOWN.has(lower)) {
      // 2. Nom déjà valide
      result = lower;
    } else {
      // 3. Tentative sans suffixe numérique (ex: "bar-chart-3" → "bar-chart-2")
      const withoutSuffix = lower.replace(/-\d+$/, '');
      if (LucideIconPipe.KNOWN.has(withoutSuffix)) {
        result = withoutSuffix;
      }
      // 4. Sinon → 'circle' (fallback visible, sans erreur)
    }

    // Stocker en cache pour les appels suivants
    LucideIconPipe.cache.set(raw, result);
    return result;
  }
}
