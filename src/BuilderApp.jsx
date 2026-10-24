import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  COMPONENTS,
  POWER_BAR_MAX_WATTS,
  SETUP_FEE_BY_CURRENCY,
  formatMoney,
} from './constants.js';
import { ComponentList, BuildSummary, ComponentPicker } from './components/BuilderComponents.jsx';
import { builderActions, createSharedBuild, loadCatalog } from './store/builderStore.js';
import { useBackgroundScene } from './hooks/useBackgroundScene.js';
import { useBuildCheck } from './hooks/useBuildCheck.js';
import { useCasePreview } from './hooks/useCasePreview.js';
import { usePersistedBuild } from './hooks/usePersistedBuild.js';
import { useSlotOptions } from './hooks/useSlotOptions.js';
import caseModels from './case-models.json';

export default function BuilderApp() {
  const dispatch = useDispatch();
  const state = useSelector((rootState) => rootState.builder);
  const [toast, setToast] = useState('');
  const [sharing, setSharing] = useState(false);
  const toastTimeoutRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useBackgroundScene();
  usePersistedBuild(state);
  useBuildCheck({ selected: state.selected, loading: state.loading });
  useSlotOptions({
    category: state.modal,
    selected: state.selected,
    query: state.searchQuery,
  });

  useEffect(() => {
    const request = dispatch(loadCatalog());
    return () => request.abort();
  }, [dispatch]);

  const productsById = useMemo(
    () => new Map(state.items.map((product) => [String(product.id), product])),
    [state.items],
  );
  const selectedParts = useMemo(
    () => COMPONENTS.map(({ id }) => productsById.get(state.selected[id])).filter(Boolean),
    [productsById, state.selected],
  );
  const selectedCase = productsById.get(state.selected.case);
  const modelUrl =
    selectedCase?.modelUrl ||
    caseModels.models?.[selectedCase?.slug] ||
    caseModels.models?.[String(selectedCase?.id)];
  const preview = useCasePreview(previewCanvasRef, selectedCase, modelUrl);
  const setupFee = SETUP_FEE_BY_CURRENCY[state.currency] ?? 0;
  const compatibility = state.check?.compatibility;
  const invalidSlots = new Set(compatibility?.invalidSlots || []);
  const total =
    state.check?.total ?? selectedParts.reduce((sum, product) => sum + product.price, 0);
  const power =
    state.check?.power?.draw ??
    selectedParts.reduce((sum, product) => sum + (Number(product.wattage) || 0), 0);
  const recommendedPsu = state.check?.power?.recommended ?? null;

  const availableOptions = useMemo(() => {
    const source =
      state.slotOptions ?? state.items.filter((product) => product.category === state.modal);
    const search = state.searchQuery.trim().toLowerCase();
    return source
      .filter(
        (product) =>
          !search ||
          `${product.name} ${product.brand} ${product.specs}`.toLowerCase().includes(search),
      )
      .slice()
      .sort((left, right) => {
        if (state.sortOrder === 'price-asc') return left.price - right.price;
        if (state.sortOrder === 'price-desc') return right.price - left.price;
        return 0;
      });
  }, [state.items, state.modal, state.searchQuery, state.slotOptions, state.sortOrder]);

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimeoutRef.current), []);

  const openPicker = useCallback(
    (category) => {
      const caseSelected = Boolean(productsById.get(state.selected.case));
      if (category !== 'case' && !caseSelected) {
        showToast('Choose a case first to unlock component selection.');
        return;
      }
      dispatch(builderActions.setModal(category));
    },
    [dispatch, productsById, showToast, state.selected.case],
  );

  const closePicker = useCallback(() => {
    dispatch(builderActions.setModal(null));
  }, [dispatch]);

  const choosePart = useCallback(
    (id) => {
      if (!state.modal) return;
      dispatch(builderActions.setPart({ category: state.modal, id: String(id) }));
    },
    [dispatch, state.modal],
  );

  const shareBuild = useCallback(async () => {
    if (!productsById.get(state.selected.case)) {
      showToast('Choose a case before sharing your build.');
      dispatch(builderActions.setModal('case'));
      return;
    }

    const componentIds = COMPONENTS.map(({ id }) => state.selected[id]).filter(Boolean);
    setSharing(true);
    try {
      const build = await dispatch(createSharedBuild(componentIds)).unwrap();
      const shareUrl = new URL(window.location.href);
      shareUrl.hash = new URLSearchParams({ build: build.id }).toString();
      await navigator.clipboard.writeText(shareUrl.href);
      showToast('Build saved. Share link copied.');
    } catch (error) {
      showToast(error.message || 'Could not create a share link.');
    } finally {
      setSharing(false);
    }
  }, [dispatch, productsById, showToast, state.selected]);

  const modalCategory = COMPONENTS.find(({ id }) => id === state.modal);
  const checkedParts = state.check?.parts || [];

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="/" aria-label="BuildLab home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
              <path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" />
            </svg>
          </span>
          <span className="brand-word">
            build<span>lab</span>
          </span>
          <small>PC BUILDER</small>
        </a>
        <div className="catalog-source">
          <span aria-hidden="true">●</span> {state.source} · {state.currency}
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="tag">CUSTOM PC · CONFIGURATOR</div>
          <h1>Build your system. Your way.</h1>
          <p>Choose your parts. Compatibility updates as you build.</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => dispatch(builderActions.resetBuild())}
          >
            ↺　Reset build
          </button>
          <button type="button" className="btn primary" disabled={sharing} onClick={shareBuild}>
            {sharing ? 'Saving…' : '↗　Share build'}
          </button>
        </div>
      </section>

      <main className="layout">
        <div>
          {state.error && (
            <p className="error-banner" role="alert">
              {state.error}
            </p>
          )}
          {state.warnings.map((warning) => (
            <p className="catalog-warning" key={warning} role="status">
              {warning}
            </p>
          ))}
          {state.loading ? (
            <section className="panel loading" role="status">
              Loading component catalog…
            </section>
          ) : (
            <ComponentList
              categories={COMPONENTS}
              selectedParts={selectedParts}
              invalidSlots={invalidSlots}
              hasCase={Boolean(selectedCase)}
              checkedParts={checkedParts}
              currency={state.currency}
              onOpen={openPicker}
            />
          )}
        </div>

        <BuildSummary
          canvasRef={previewCanvasRef}
          preview={preview}
          selectedParts={selectedParts}
          total={total}
          setupFee={setupFee}
          currency={state.currency}
          power={power}
          recommendedPsu={recommendedPsu}
          compatibility={compatibility}
          checkError={state.checkError}
        />
      </main>

      <footer className="foot">
        <span>buildlab · PC configurator</span>
        <span>Local sample catalog · estimated {state.currency} prices</span>
      </footer>

      {modalCategory && (
        <ComponentPicker
          key={modalCategory.id}
          category={modalCategory}
          options={availableOptions}
          loading={state.slotLoading}
          query={state.searchQuery}
          sortOrder={state.sortOrder}
          onQueryChange={(query) => dispatch(builderActions.setSearchQuery(query))}
          onSortChange={(sortOrder) => dispatch(builderActions.setSortOrder(sortOrder))}
          onChoose={choosePart}
          onClose={closePicker}
          currency={state.currency}
          error={state.slotError}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
