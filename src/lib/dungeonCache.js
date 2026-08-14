import { reactive } from 'vue'

// Cache en mémoire, par personnage. Une fois chargé, Dashboard et Kanban
// réutilisent le MÊME tableau — donc cocher un badge sur l'un se voit
// immédiatement sur l'autre (ce sont les mêmes objets), sans refaire une
// seule requête réseau. Le cache n'est vidé qu'au changement de personnage
// ou après une action qui change vraiment un prix (cf. invalidate()).
const cache = reactive({})

export async function getCachedRentabilities(characterId, loader) {
  if (!cache[characterId]) {
    cache[characterId] = await loader()
  }
  return cache[characterId]
}

export function invalidateDungeonCache(characterId) {
  delete cache[characterId]
}
