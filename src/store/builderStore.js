import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchBuild,
  fetchCatalog,
  requestBuildCheck,
  fetchComponentOptions,
  saveBuild,
} from '../api/client.js';
import { COMPONENT_CATEGORIES } from '../constants.js';

const SHARED_BUILD_PATTERN = /^BL-(?:[A-F0-9]{8}|[A-Za-z0-9_-]{1,1024})$/;

function getSharedBuildId() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get('build');
  return value && SHARED_BUILD_PATTERN.test(value) ? value : null;
}

function readSavedSelection() {
  try {
    const value = JSON.parse(window.localStorage.getItem('buildlab') || 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return Object.fromEntries(
      COMPONENT_CATEGORIES.map((category) => [
        category,
        typeof value[category] === 'string' ? value[category] : null,
      ]),
    );
  } catch (error) {
    console.warn('Could not read the saved build:', error);
    return null;
  }
}

function selectionFromIds(componentIds, items) {
  const selected = Object.fromEntries(COMPONENT_CATEGORIES.map((category) => [category, null]));
  const allowedIds = new Set(
    (Array.isArray(componentIds) ? componentIds : []).filter((id) => typeof id === 'string'),
  );
  for (const item of items) {
    if (allowedIds.has(String(item.id)) && COMPONENT_CATEGORIES.includes(item.category)) {
      selected[item.category] = String(item.id);
    }
  }
  return selected;
}

function validateSelection(selection, items) {
  const itemIds = new Set(items.map((item) => String(item.id)));
  return Object.fromEntries(
    COMPONENT_CATEGORIES.map((category) => {
      const id = selection?.[category];
      return [category, typeof id === 'string' && itemIds.has(id) ? id : null];
    }),
  );
}

export const loadCatalog = createAsyncThunk('builder/loadCatalog', async (_, { signal }) => {
  const catalog = await fetchCatalog(signal);
  const sharedBuildId = getSharedBuildId();

  if (sharedBuildId) {
    try {
      const sharedBuild = await fetchBuild(sharedBuildId, signal);
      return {
        catalog,
        selection: selectionFromIds(sharedBuild.components, catalog.items),
        canPersistSelection: false,
      };
    } catch (error) {
      console.warn('Could not load the shared build:', error);
    }
  }

  return {
    catalog,
    selection: validateSelection(readSavedSelection(), catalog.items),
    canPersistSelection: true,
  };
});

export const loadComponentOptions = createAsyncThunk(
  'builder/loadComponentOptions',
  async (request, { signal }) => fetchComponentOptions({ ...request, signal }),
);

export const checkBuild = createAsyncThunk('builder/checkBuild', async (productIds, { signal }) =>
  requestBuildCheck(productIds, signal),
);

export const createSharedBuild = createAsyncThunk(
  'builder/createSharedBuild',
  async (componentIds, { signal }) => saveBuild(componentIds, signal),
);

const emptySelection = Object.fromEntries(COMPONENT_CATEGORIES.map((category) => [category, null]));

const builderSlice = createSlice({
  name: 'builder',
  initialState: {
    items: [],
    selected: { ...emptySelection },
    modal: null,
    searchQuery: '',
    sortOrder: 'recommended',
    loading: true,
    error: '',
    currency: 'GBP',
    source: 'Local JSON catalog',
    warnings: [],
    check: null,
    checkError: '',
    slotOptions: null,
    slotLoading: false,
    slotError: '',
    canPersistSelection: false,
  },
  reducers: {
    setPart(state, action) {
      const { category, id } = action.payload;
      state.selected[category] = id;
      state.modal = null;
      state.slotOptions = null;
      state.check = null;
      state.checkError = '';
      state.canPersistSelection = true;
    },
    setModal(state, action) {
      state.modal = action.payload;
      state.slotOptions = null;
      state.slotLoading = false;
      state.slotError = '';
      state.searchQuery = '';
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    setSortOrder(state, action) {
      state.sortOrder = action.payload;
    },
    resetBuild(state) {
      state.selected = { ...emptySelection };
      state.modal = null;
      state.slotOptions = null;
      state.slotLoading = false;
      state.slotError = '';
      state.check = null;
      state.checkError = '';
      state.canPersistSelection = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCatalog.fulfilled, (state, action) => {
        const { catalog, selection, canPersistSelection } = action.payload;
        state.items = catalog.items;
        state.currency = catalog.currency || 'GBP';
        state.source = catalog.source || 'Local JSON catalog';
        state.warnings = catalog.warnings || [];
        state.selected = selection;
        state.canPersistSelection = canPersistSelection;
        state.loading = false;
      })
      .addCase(loadCatalog.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.error = action.error.message || 'Could not load the catalog.';
        state.loading = false;
      })
      .addCase(loadComponentOptions.pending, (state) => {
        state.slotLoading = true;
        state.slotError = '';
      })
      .addCase(loadComponentOptions.fulfilled, (state, action) => {
        state.slotOptions = action.payload.items || [];
        state.slotLoading = false;
        state.slotError = '';
      })
      .addCase(loadComponentOptions.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.slotOptions = [];
        state.slotLoading = false;
        state.slotError = action.error.message || 'Could not load component options.';
      })
      .addCase(checkBuild.fulfilled, (state, action) => {
        state.check = action.payload;
        state.checkError = '';
      })
      .addCase(checkBuild.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.checkError = action.error.message || 'Compatibility check failed.';
      });
  },
});

export const builderActions = builderSlice.actions;
export const store = configureStore({
  reducer: { builder: builderSlice.reducer },
});
