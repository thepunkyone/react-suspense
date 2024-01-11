// Cache resources
// http://localhost:3000/isolated/exercise/04.js

import * as React from 'react'
import {
  fetchPokemon,
  PokemonInfoFallback,
  PokemonForm,
  PokemonDataView,
  PokemonErrorBoundary,
} from '../pokemon'
import {createResource} from '../utils'

function PokemonInfo({pokemonResource}) {
  const pokemon = pokemonResource.read()
  return (
    <div>
      <div className="pokemon-info__img-wrapper">
        <img src={pokemon.image} alt={pokemon.name} />
      </div>
      <PokemonDataView pokemon={pokemon} />
    </div>
  )
}

const SUSPENSE_CONFIG = {
  timeoutMs: 4000,
  busyDelayMs: 300,
  busyMinDurationMs: 700,
}

function createPokemonResource(pokemonName) {
  return createResource(fetchPokemon(pokemonName))
}

const PokemonResourceCacheContext = React.createContext()

const PokemonResourceCacheProvider = ({children, cacheTime}) => {
  const cache = React.useRef({})

  const getPokemonResource = React.useCallback(pokemonName => {
    const lowerCaseName = pokemonName.toLowerCase()

    let pokemonResource = cache.current[lowerCaseName]

    if (!pokemonResource) {
      pokemonResource = {
        addedAt: Date.now(),
        resource: createPokemonResource(lowerCaseName),
      }
      cache.current[lowerCaseName] = pokemonResource
    }

    return pokemonResource.resource
  }, [])

  const removeFromCacheIfStale = cacheKey => {
    if (
      cache.current[cacheKey] &&
      Date.now() - cache.current[cacheKey]?.addedAt > cacheTime
    ) {
      delete cache.current[cacheKey]
    }
  }

  React.useEffect(() => {
    const id = setInterval(() => {
      const cacheKeys = Object.keys(cache.current)

      cacheKeys.forEach(removeFromCacheIfStale)
    }, 1000)

    return () => clearInterval(id)
  }, [cacheTime])

  return (
    <PokemonResourceCacheContext.Provider value={getPokemonResource}>
      {children}
    </PokemonResourceCacheContext.Provider>
  )
}

const usePokemonResourceCache = () =>
  React.useContext(PokemonResourceCacheContext)

function App() {
  const [pokemonName, setPokemonName] = React.useState('')
  const [startTransition, isPending] = React.useTransition(SUSPENSE_CONFIG)
  const [pokemonResource, setPokemonResource] = React.useState(null)

  const getPokemonResource = usePokemonResourceCache()

  React.useEffect(() => {
    if (!pokemonName) {
      setPokemonResource(null)
      return
    }
    startTransition(() => {
      setPokemonResource(getPokemonResource(pokemonName))
    })
  }, [pokemonName, startTransition, getPokemonResource])

  function handleSubmit(newPokemonName) {
    setPokemonName(newPokemonName)
  }

  function handleReset() {
    setPokemonName('')
  }

  return (
    <div className="pokemon-info-app">
      <PokemonForm pokemonName={pokemonName} onSubmit={handleSubmit} />
      <hr />
      <div className={`pokemon-info ${isPending ? 'pokemon-loading' : ''}`}>
        {pokemonResource ? (
          <PokemonErrorBoundary
            onReset={handleReset}
            resetKeys={[pokemonResource]}
          >
            <React.Suspense
              fallback={<PokemonInfoFallback name={pokemonName} />}
            >
              <PokemonInfo pokemonResource={pokemonResource} />
            </React.Suspense>
          </PokemonErrorBoundary>
        ) : (
          'Submit a pokemon'
        )}
      </div>
    </div>
  )
}

function AppWithProvider() {
  return (
    <PokemonResourceCacheProvider cacheTime={5000}>
      <App />
    </PokemonResourceCacheProvider>
  )
}

export default AppWithProvider
