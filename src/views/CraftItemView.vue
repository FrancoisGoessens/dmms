<script setup>
import { ref, computed } from 'vue'

// Données factices — le dropdown viendra de cache_craftable_items,
// le calcul de cache_item_coefficients + formule locale de brisage.
const items = ref([
  {
    id: 'ti2', name: 'Cape Craqueleuse', level: 65,
    stats: [
      { stat: 'Force', min: 15, max: 35, jet: 25, runeAbbr: 'Fo', runeName: 'Fo', price: 39 },
      { stat: 'Vitalité', min: 10, max: 25, jet: 18, runeAbbr: 'Vi', runeName: 'Vi', price: 188 },
    ],
  },
  {
    id: 'ti3', name: 'Cape Kanigrula', level: 140,
    stats: [
      { stat: 'Intelligence', min: 20, max: 45, jet: 32, runeAbbr: 'Ine', runeName: 'Ine', price: 40 },
      { stat: 'Sagesse', min: 5, max: 15, jet: 10, runeAbbr: 'Sa', runeName: 'Sa', price: 204 },
    ],
  },
])

const selectedId = ref(items.value[0].id)
const item = computed(() => items.value.find((i) => i.id === selectedId.value))
const marketPrice = ref(3500)
const focusedStat = ref(null)

// Le jet peut sortir de la fourchette théorique dans les deux sens :
// - OVER (forgemagie qui pousse une carac au-dessus de son max)
// - UNDER (on laisse baisser une carac dont on se fiche, jusqu'à 0 — une
//   stat négative compte comme 0, jamais moins)
function dec(row) { row.jet = Math.max(0, row.jet - 1) }
function inc(row) { row.jet++ }
function isOver(row) { return row.jet > row.max }
function isUnder(row) { return row.jet < row.min }

// Placeholder — vraie formule de brisage à brancher (jet/coefficient/poids).
function qtyNoFocus(row) { return +((row.jet / row.max) * 1.4 * 10).toFixed(1) }
function qtyFocus(row) { return +((row.jet / row.max) * 2.2 * 10).toFixed(1) }
function kamas(qty, price) { return Math.round(qty * price) }

const totalNoFocus = computed(() =>
  item.value.stats.reduce((s, r) => s + kamas(qtyNoFocus(r), r.price), 0)
)
const rentability = computed(() =>
  marketPrice.value ? Math.round((totalNoFocus.value / marketPrice.value) * 100) : 0
)
</script>

<template>
  <div>
    <div class="panel-pad top-card">
      <div class="top-row">
        <div class="top-fields">
          <div class="field">
            <div class="field-label">Item</div>
            <select v-model="selectedId" class="input-small item-select">
              <option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }} (niv. {{ it.level }})</option>
            </select>
          </div>
          <div class="field">
            <div class="field-label">Prix de l'item (marché)</div>
            <input type="number" v-model.number="marketPrice" class="input-small price-input" />
          </div>
        </div>
        <div class="top-stats">
          <div class="stat">
            <div class="stat-label">Estimation (sans focus)</div>
            <div class="stat-value accent">{{ totalNoFocus.toLocaleString('fr-FR') }} k</div>
          </div>
          <div class="stat">
            <div class="stat-label">Rentabilité</div>
            <div class="stat-value">{{ rentability }}%</div>
          </div>
        </div>
      </div>

      <div class="item-identity">
        <div class="item-image"></div>
        <div>
          <div class="item-title">{{ item.name }}</div>
          <div class="item-sub">Niveau {{ item.level }}</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="table-grid table-head">
        <div>Caractéristique</div>
        <div>Jet (min · valeur · max)</div>
        <div>Rune</div>
        <div class="center">Prix /u</div>
        <div class="band band-no-focus group-head">Sans focus</div>
        <div class="band band-focus group-head">Avec focus</div>
      </div>
      <div class="table-grid table-subhead">
        <div></div><div></div><div></div><div></div>
        <div class="band band-no-focus right muted">Runes</div>
        <div class="band band-no-focus right muted">Kamas</div>
        <div class="band band-focus right muted">Runes</div>
        <div class="band band-focus right muted">Kamas</div>
      </div>

      <div v-for="row in item.stats" :key="row.stat" class="table-grid table-row">
        <div class="stat-name">{{ row.stat }}</div>
        <div class="jet-cell">
          <span class="muted">{{ row.min }}</span>
          <button class="step-btn" @click="dec(row)">−</button>
          <input
            type="number"
            class="jet-input"
            :class="{ over: isOver(row), under: isUnder(row) }"
            v-model.number="row.jet"
          />
          <button class="step-btn" @click="inc(row)">+</button>
          <span class="muted">{{ row.max }}</span>
          <span v-if="isOver(row)" class="tag over-tag">OVER</span>
          <span v-if="isUnder(row)" class="tag under-tag">UNDER</span>
        </div>
        <div class="rune-cell">
          <div class="rune-icon" :class="{ focused: focusedStat === row.stat }" @click="focusedStat = focusedStat === row.stat ? null : row.stat">
            {{ row.runeAbbr }}
          </div>
          {{ row.runeName }}
        </div>
        <div class="center">{{ row.price }}</div>
        <div class="band band-no-focus right muted">{{ qtyNoFocus(row) }}</div>
        <div class="band band-no-focus right bold">{{ kamas(qtyNoFocus(row), row.price).toLocaleString('fr-FR') }} k</div>
        <div class="band band-focus right muted">{{ qtyFocus(row) }}</div>
        <div class="band band-focus right bold accent">{{ kamas(qtyFocus(row), row.price).toLocaleString('fr-FR') }} k</div>
      </div>

      <div class="total-row">
        <div class="total-label">Total estimé sans focus</div>
        <div class="total-value">{{ totalNoFocus.toLocaleString('fr-FR') }} k</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-card { margin-bottom: 16px; }
.top-row { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
.top-fields { display: flex; gap: 16px; }
.field-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.item-select { width: 220px; }
.price-input { width: 140px; }
.top-stats { display: flex; gap: 28px; text-align: right; }
.stat-label { font-size: 11px; color: var(--text-secondary); }
.stat-value { font-size: 20px; font-weight: 800; }
.stat-value.accent { color: var(--accent); }

.item-identity { display: flex; align-items: center; gap: 14px; }
.item-image { width: 56px; height: 56px; border-radius: 10px; background: var(--panel-2); flex-shrink: 0; }
.item-title { font-size: 18px; font-weight: 800; }
.item-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

.table-grid {
  display: grid;
  grid-template-columns: 1.3fr 1.8fr 1fr 0.6fr 0.6fr 0.8fr 0.6fr 0.8fr;
  align-items: center;
  column-gap: 0;
}
.table-grid > div { padding: 0 10px; }
.table-grid > div:first-child { padding-left: 16px; }
.table-grid > div:last-child { padding-right: 16px; }

.table-head { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; padding-top: 14px; }
.table-head .band { grid-column: span 2; text-align: center; padding-top: 8px; padding-bottom: 8px; border-radius: 8px 8px 0 0; }
.table-subhead { font-size: 10px; }
.table-subhead .band { padding-bottom: 10px; }
.table-row { padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.table-row .band { padding-top: 12px; padding-bottom: 12px; margin: -12px 0; }

/* Bandes de couleur continues qui délimitent visuellement les 2 colonnes
   "sans focus" et les 2 colonnes "avec focus" du reste du tableau. */
.band-no-focus { background: var(--panel-2); }
.band-focus { background: var(--soft-accent-bg); }

.right { text-align: right; }
.center { text-align: center; }
.muted { color: var(--text-secondary); }
.bold { font-weight: 700; }
.accent { color: var(--accent-text); }
.stat-name { font-weight: 600; }

.jet-cell { display: flex; align-items: center; gap: 6px; font-size: 12px; flex-wrap: wrap; }
.jet-input {
  width: 40px; font-weight: 700; font-size: 13px; text-align: center; padding: 2px 0;
  border: 1px solid var(--border); border-radius: 6px; background: var(--input); color: var(--text);
}
.jet-input.over { color: var(--amber); border-color: var(--amber); }
.jet-input.under { color: var(--info); border-color: var(--info); }
.tag { font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; }
.over-tag { color: var(--amber); background: color-mix(in oklch, var(--amber) 20%, transparent); }
.under-tag { color: var(--info); background: color-mix(in oklch, var(--info) 20%, transparent); }
.step-btn { width: 22px; height: 22px; border-radius: 6px; background: var(--panel-2); border: none; cursor: pointer; font-weight: 700; color: var(--text); flex-shrink: 0; }

.rune-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.rune-icon {
  width: 26px; height: 26px; border-radius: 6px; background: var(--panel-2);
  display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700;
  color: var(--text-secondary); cursor: pointer; flex-shrink: 0; border: 1.5px solid transparent;
}
.rune-icon.focused { border-color: var(--accent); color: var(--accent-text); background: var(--soft-accent-bg); }

.total-row { display: flex; justify-content: flex-end; align-items: baseline; gap: 16px; padding: 14px 16px; }
.total-label { font-size: 12px; color: var(--text-secondary); }
.total-value { font-size: 20px; font-weight: 800; }
</style>
