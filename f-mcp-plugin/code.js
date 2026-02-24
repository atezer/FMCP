// F-MCP ATezer Bridge - MCP Plugin
// Bridges Figma API to MCP clients via plugin UI window
// Supports: Variables, Components, Styles, and more
// Uses postMessage to communicate with UI, bypassing worker sandbox limitations
// Puppeteer can access UI iframe's window context to retrieve data

// Console log buffer for figma_get_console_logs (no CDP)
var __consoleLogBuffer = [];
var __consoleLogLimit = 200;
var _origLog = console.log, _origWarn = console.warn, _origError = console.error;
function _pushLog(level, args) {
  var arr = Array.prototype.slice.call(args);
  __consoleLogBuffer.push({ level: level, time: Date.now(), args: arr });
  if (__consoleLogBuffer.length > __consoleLogLimit) __consoleLogBuffer.shift();
}
console.log = function() { _pushLog('log', arguments); _origLog.apply(console, arguments); };
console.warn = function() { _pushLog('warn', arguments); _origWarn.apply(console, arguments); };
console.error = function() { _pushLog('error', arguments); _origError.apply(console, arguments); };

console.log('🌉 [F-MCP ATezer Bridge] Plugin loaded and ready');

// Show minimal UI - compact status indicator
figma.showUI(__html__, { width: 200, height: 56, visible: true, themeColors: true });

// Immediately fetch and send variables data to UI
(async () => {
  try {
    console.log('🌉 [F-MCP ATezer Bridge] Fetching variables...');

    // Get all local variables and collections
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    console.log(`🌉 [F-MCP ATezer Bridge] Found ${variables.length} variables in ${collections.length} collections`);

    // Format the data
    const variablesData = {
      success: true,
      timestamp: Date.now(),
      fileKey: figma.fileKey || null,
      variables: variables.map(v => ({
        id: v.id,
        name: v.name,
        key: v.key,
        resolvedType: v.resolvedType,
        valuesByMode: v.valuesByMode,
        variableCollectionId: v.variableCollectionId,
        scopes: v.scopes,
        description: v.description,
        hiddenFromPublishing: v.hiddenFromPublishing
      })),
      variableCollections: collections.map(c => ({
        id: c.id,
        name: c.name,
        key: c.key,
        modes: c.modes,
        defaultModeId: c.defaultModeId,
        variableIds: c.variableIds
      }))
    };

    // Send to UI via postMessage
    figma.ui.postMessage({
      type: 'VARIABLES_DATA',
      data: variablesData
    });

    console.log('🌉 [F-MCP ATezer Bridge] Variables data sent to UI successfully');
    console.log('🌉 [F-MCP ATezer Bridge] UI iframe now has variables data accessible via window.__figmaVariablesData');

  } catch (error) {
    console.error('🌉 [F-MCP ATezer Bridge] Error fetching variables:', error);
    figma.ui.postMessage({
      type: 'ERROR',
      error: error.message || String(error)
    });
  }
})();

// Helper function to serialize a variable for response
function serializeVariable(v) {
  return {
    id: v.id,
    name: v.name,
    key: v.key,
    resolvedType: v.resolvedType,
    valuesByMode: v.valuesByMode,
    variableCollectionId: v.variableCollectionId,
    scopes: v.scopes,
    description: v.description,
    hiddenFromPublishing: v.hiddenFromPublishing
  };
}

// Helper function to serialize a collection for response
function serializeCollection(c) {
  return {
    id: c.id,
    name: c.name,
    key: c.key,
    modes: c.modes,
    defaultModeId: c.defaultModeId,
    variableIds: c.variableIds
  };
}

// Helper to convert hex color to Figma RGB (0-1 range)
function hexToFigmaRGB(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Validate hex characters BEFORE parsing (prevents NaN values)
  if (!/^[0-9A-Fa-f]+$/.test(hex)) {
    throw new Error('Invalid hex color: "' + hex + '" contains non-hex characters. Use only 0-9 and A-F.');
  }

  // Parse hex values
  var r, g, b, a = 1;

  if (hex.length === 3) {
    // #RGB format
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else if (hex.length === 4) {
    // #RGBA format (CSS4 shorthand)
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
    a = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 6) {
    // #RRGGBB format
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else if (hex.length === 8) {
    // #RRGGBBAA format
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
    a = parseInt(hex.substring(6, 8), 16) / 255;
  } else {
    throw new Error('Invalid hex color format: "' + hex + '". Expected 3, 4, 6, or 8 hex characters (e.g., #RGB, #RGBA, #RRGGBB, #RRGGBBAA).');
  }

  return { r: r, g: g, b: b, a: a };
}

// Listen for requests from UI (e.g., component data requests, write operations)
figma.ui.onmessage = async (msg) => {

  function rgbaToHex(color) {
    if (!color || typeof color !== 'object') return null;
    var r = Math.round((Number(color.r) !== undefined ? Number(color.r) : 0) * 255);
    var g = Math.round((Number(color.g) !== undefined ? Number(color.g) : 0) * 255);
    var b = Math.round((Number(color.b) !== undefined ? Number(color.b) : 0) * 255);
    return '#' + [r, g, b].map(function(x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function nameToSuiComponent(name, description) {
    var raw = (name || '') + (description ? ' ' + description : '');
    raw = raw.replace(/[0-9_\-\s]+/g, ' ').trim().split(/\s+/);
    if (raw.length === 0 || (raw.length === 1 && !raw[0])) return null;
    return raw.map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('');
  }

  function buildLayoutSummary(layout, outputHint) {
    if (!layout || !layout.layoutMode) return null;
    var parts = [];
    var dir = layout.layoutMode === 'HORIZONTAL' ? 'row' : layout.layoutMode === 'VERTICAL' ? 'col' : 'grid';
    if (outputHint === 'tailwind') {
      parts.push('flex' + (dir === 'row' ? '' : '-col'));
      if (layout.itemSpacing != null) parts.push('gap-' + Math.round(layout.itemSpacing));
      var p = layout.paddingLeft || layout.paddingRight || layout.paddingTop || layout.paddingBottom;
      if (p != null) parts.push('p-' + Math.round(p));
    } else if (outputHint === 'react') {
      parts.push('flex ' + dir);
      if (layout.itemSpacing != null) parts.push('gap ' + layout.itemSpacing);
      if (layout.paddingLeft != null) parts.push('paddingLeft ' + layout.paddingLeft);
      if (layout.paddingTop != null) parts.push('paddingTop ' + layout.paddingTop);
    } else {
      parts.push(dir === 'grid' ? 'grid' : 'flex ' + dir);
      if (layout.itemSpacing != null) parts.push('gap ' + layout.itemSpacing);
      if (layout.paddingLeft != null || layout.paddingTop != null) parts.push('padding ' + (layout.paddingLeft || 0) + '/' + (layout.paddingTop || 0));
    }
    return parts.join(', ');
  }

  // Resolve variable alias(es) to names (SUI token reference — 2.3)
  async function resolveVariableNames(aliases) {
    if (!aliases) return [];
    var list = Array.isArray(aliases) ? aliases : (aliases.id ? [aliases] : []);
    var names = [];
    for (var i = 0; i < list.length; i++) {
      var alias = list[i];
      if (alias && alias.id) {
        try {
          var v = await figma.variables.getVariableByIdAsync(alias.id);
          if (v && v.name) names.push(v.name);
        } catch (e) { /* skip */ }
      }
    }
    return names;
  }

  // Build node payload for GET_DOCUMENT_STRUCTURE / GET_NODE_CONTEXT (layout, constraints, visual, typography, code-ready, SUI)
  async function buildNodePayload(node, currentDepth, maxDepth, opts) {
    if (currentDepth > maxDepth) return null;
    var verbosity = opts.verbosity || 'summary';
    var includeLayout = opts.includeLayout === true || verbosity === 'full';
    var includeVisual = opts.includeVisual === true || verbosity === 'full';
    var includeTypography = opts.includeTypography === true || verbosity === 'full';
    var includeCodeReady = opts.includeCodeReady !== false && (includeLayout || includeVisual);
    var outputHint = opts.outputHint || null;

    var out = { id: node.id, name: node.name, type: node.type };

    if (verbosity !== 'inventory' && verbosity !== 'summary') {
      if (node.absoluteBoundingBox) out.absoluteBoundingBox = node.absoluteBoundingBox;
      if (node.width !== undefined) out.width = node.width;
      if (node.height !== undefined) out.height = node.height;
      if (node.type === 'TEXT' && node.characters !== undefined) out.characters = node.characters;
    }

    var incompleteReasons = [];
    if (node.description !== undefined && node.description !== '') out.description = node.description;
    var suiName = nameToSuiComponent(node.name, node.description);
    if (suiName) { out.roleHint = suiName; out.suiComponent = suiName; }

    if (node.type === 'INSTANCE' && 'componentProperties' in node && node.componentProperties) {
      var props = node.componentProperties;
      var propNames = Object.keys(props);
      if (propNames.length > 0) {
        out.suggestedProps = {};
        var summaryParts = [];
        for (var i = 0; i < propNames.length; i++) {
          var pn = propNames[i];
          var v = props[pn];
          out.suggestedProps[pn] = v;
          summaryParts.push(pn + '=' + (typeof v === 'string' ? v : String(v)));
        }
        out.variantSummary = summaryParts.join(', ');
      }
    }

    if (includeLayout) {
      if ('constraints' in node && node.constraints) {
        out.constraints = { horizontal: node.constraints.horizontal, vertical: node.constraints.vertical };
      }
      if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
        var layout = { layoutMode: node.layoutMode };
        if (node.paddingLeft !== undefined) layout.paddingLeft = node.paddingLeft;
        if (node.paddingRight !== undefined) layout.paddingRight = node.paddingRight;
        if (node.paddingTop !== undefined) layout.paddingTop = node.paddingTop;
        if (node.paddingBottom !== undefined) layout.paddingBottom = node.paddingBottom;
        if (node.itemSpacing !== undefined) layout.itemSpacing = node.itemSpacing;
        if (node.primaryAxisAlignItems !== undefined) layout.primaryAxisAlignItems = node.primaryAxisAlignItems;
        if (node.counterAxisAlignItems !== undefined) layout.counterAxisAlignItems = node.counterAxisAlignItems;
        if (node.primaryAxisSizingMode !== undefined) layout.primaryAxisSizingMode = node.primaryAxisSizingMode;
        if (node.counterAxisSizingMode !== undefined) layout.counterAxisSizingMode = node.counterAxisSizingMode;
        if (node.layoutWrap !== undefined) layout.layoutWrap = node.layoutWrap;
        if (node.counterAxisSpacing != null) layout.counterAxisSpacing = node.counterAxisSpacing;
        if (node.layoutMode === 'GRID') {
          if (node.gridRowCount !== undefined) layout.gridRowCount = node.gridRowCount;
          if (node.gridColumnCount !== undefined) layout.gridColumnCount = node.gridColumnCount;
          if (node.gridRowGap !== undefined) layout.gridRowGap = node.gridRowGap;
          if (node.gridColumnGap !== undefined) layout.gridColumnGap = node.gridColumnGap;
        }
        out.layout = layout;
        if (includeCodeReady) out.layoutSummary = buildLayoutSummary(layout, outputHint);
      }
      if ('layoutAlign' in node) out.layoutAlign = node.layoutAlign;
      if ('layoutGrow' in node) out.layoutGrow = node.layoutGrow;
      if ('layoutPositioning' in node) out.layoutPositioning = node.layoutPositioning;
      if ('layoutSizingHorizontal' in node) out.layoutSizingHorizontal = node.layoutSizingHorizontal;
      if ('layoutSizingVertical' in node) out.layoutSizingVertical = node.layoutSizingVertical;
      if (node.minWidth != null) out.minWidth = node.minWidth;
      if (node.maxWidth != null) out.maxWidth = node.maxWidth;
      if (node.minHeight != null) out.minHeight = node.minHeight;
      if (node.maxHeight != null) out.maxHeight = node.maxHeight;
    }

    var isMixed = typeof figma !== 'undefined' && figma.mixed !== undefined ? function(v) { return v === figma.mixed; } : function() { return false; };
    if (includeVisual) {
      var hasImageFill = false;
      if ('fills' in node && node.fills !== undefined && !isMixed(node.fills)) {
        try {
          var fillsCopy = JSON.parse(JSON.stringify(node.fills));
          out.fills = fillsCopy;
          if (Array.isArray(fillsCopy) && fillsCopy.length > 0) {
            var first = fillsCopy[0];
            if (first && first.type === 'SOLID' && first.color) {
              var hex = rgbaToHex(first.color);
              if (hex) { out.colorHex = hex; out.primaryColorHex = hex; }
            }
            for (var f = 0; f < fillsCopy.length; f++) {
              if (fillsCopy[f].type === 'IMAGE' || fillsCopy[f].imageRef) hasImageFill = true;
            }
          }
        } catch (e) { out.fills = []; }
      } else if ('fills' in node && node.fills !== undefined) {
        out.fills = 'mixed';
        incompleteReasons.push('mixed fills');
      }
      if (hasImageFill) { out.hasImageFill = true; incompleteReasons.push('image fill'); }
      if ('strokes' in node && node.strokes !== undefined && !isMixed(node.strokes)) {
        try { out.strokes = JSON.parse(JSON.stringify(node.strokes)); } catch (e) { out.strokes = []; }
      } else if ('strokes' in node && node.strokes !== undefined) {
        out.strokes = 'mixed';
        incompleteReasons.push('mixed stroke');
      }
      if ('effects' in node && node.effects && node.effects.length > 0) {
        try { out.effects = JSON.parse(JSON.stringify(node.effects)); } catch (e) { out.effects = []; }
      }
      if ('opacity' in node && node.opacity !== undefined) out.opacity = node.opacity;
      if ('cornerRadius' in node && node.cornerRadius !== undefined && !isMixed(node.cornerRadius)) out.cornerRadius = node.cornerRadius;
      if ('strokeWeight' in node && node.strokeWeight !== undefined && !isMixed(node.strokeWeight)) out.strokeWeight = node.strokeWeight;
      if ('strokeAlign' in node) out.strokeAlign = node.strokeAlign;
      /* Variable adı çözümlemesi sadece verbosity full'da (büyük dosyada binlerce getVariableByIdAsync timeout'a yol açar) */
      if (verbosity === 'full' && 'boundVariables' in node && node.boundVariables) {
        var bv = node.boundVariables;
        if (bv.fills && (Array.isArray(bv.fills) ? bv.fills.length : (bv.fills && bv.fills.id))) {
          var fillNames = await resolveVariableNames(bv.fills);
          if (fillNames.length) out.fillVariableNames = fillNames;
        }
        if (bv.strokes && (Array.isArray(bv.strokes) ? bv.strokes.length : (bv.strokes && bv.strokes.id))) {
          var strokeNames = await resolveVariableNames(bv.strokes);
          if (strokeNames.length) out.strokeVariableNames = strokeNames;
        }
      }
    }

    if (includeTypography && node.type === 'TEXT') {
      if (node.fontName !== undefined && !isMixed(node.fontName)) out.fontName = node.fontName;
      else if (node.type === 'TEXT') incompleteReasons.push('font not loaded');
      if (node.fontSize !== undefined && !isMixed(node.fontSize)) out.fontSize = node.fontSize;
      if (node.lineHeight !== undefined && !isMixed(node.lineHeight)) out.lineHeight = node.lineHeight;
      if (node.textStyleId !== undefined && !isMixed(node.textStyleId) && node.textStyleId) out.textStyleId = node.textStyleId;
    }

    if (incompleteReasons.length > 0) out.incompleteReasons = incompleteReasons;

    if (node.children && node.children.length > 0 && currentDepth < maxDepth) {
      var childPayloads = await Promise.all(node.children.map(function(c) { return buildNodePayload(c, currentDepth + 1, maxDepth, opts); }));
      out.children = childPayloads.filter(Boolean);
      if (verbosity === 'summary' || verbosity === 'inventory') out.childCount = node.children.length;
    }
    return out;
  }

  // ============================================================================
  // EXECUTE_CODE - Arbitrary code execution (Power Tool)
  // ============================================================================
  if (msg.type === 'EXECUTE_CODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Executing code, length:', msg.code.length);

      // Use eval with async IIFE wrapper instead of AsyncFunction constructor
      // AsyncFunction is restricted in Figma's plugin sandbox, but eval works
      // See: https://developers.figma.com/docs/plugins/resource-links

      // Wrap user code in an async IIFE that returns a Promise
      // This allows async/await in user code while using eval
      var wrappedCode = "(async function() {\n" + msg.code + "\n})()";

      console.log('🌉 [F-MCP ATezer Bridge] Wrapped code for eval');

      // Execute with timeout
      var timeoutMs = msg.timeout || 5000;
      var timeoutPromise = new Promise(function(_, reject) {
        setTimeout(function() {
          reject(new Error('Execution timed out after ' + timeoutMs + 'ms'));
        }, timeoutMs);
      });

      var codePromise;
      try {
        // eval returns the Promise from the async IIFE
        codePromise = eval(wrappedCode);
      } catch (syntaxError) {
        // Log the actual syntax error message
        var syntaxErrorMsg = syntaxError && syntaxError.message ? syntaxError.message : String(syntaxError);
        console.error('🌉 [F-MCP ATezer Bridge] Syntax error in code:', syntaxErrorMsg);
        figma.ui.postMessage({
          type: 'EXECUTE_CODE_RESULT',
          requestId: msg.requestId,
          success: false,
          error: 'Syntax error: ' + syntaxErrorMsg
        });
        return;
      }

      var result = await Promise.race([
        codePromise,
        timeoutPromise
      ]);

      console.log('🌉 [F-MCP ATezer Bridge] Code executed successfully, result type:', typeof result);

      // Analyze result for potential silent failures
      var resultAnalysis = {
        type: typeof result,
        isNull: result === null,
        isUndefined: result === undefined,
        isEmpty: false,
        warning: null
      };

      // Check for empty results that might indicate a failed search/operation
      if (Array.isArray(result)) {
        resultAnalysis.isEmpty = result.length === 0;
        if (resultAnalysis.isEmpty) {
          resultAnalysis.warning = 'Code returned an empty array. If you were searching for nodes, none were found.';
        }
      } else if (result !== null && typeof result === 'object') {
        var keys = Object.keys(result);
        resultAnalysis.isEmpty = keys.length === 0;
        if (resultAnalysis.isEmpty) {
          resultAnalysis.warning = 'Code returned an empty object. The operation may not have found what it was looking for.';
        }
        // Check for common "found nothing" patterns
        if (result.length === 0 || result.count === 0 || result.foundCount === 0 || (result.nodes && result.nodes.length === 0)) {
          resultAnalysis.warning = 'Code returned a result indicating nothing was found (count/length is 0).';
        }
      } else if (result === null) {
        resultAnalysis.warning = 'Code returned null. The requested node or resource may not exist.';
      } else if (result === undefined) {
        resultAnalysis.warning = 'Code returned undefined. Make sure your code has a return statement.';
      }

      if (resultAnalysis.warning) {
        console.warn('🌉 [F-MCP ATezer Bridge] ⚠️ Result warning:', resultAnalysis.warning);
      }

      figma.ui.postMessage({
        type: 'EXECUTE_CODE_RESULT',
        requestId: msg.requestId,
        success: true,
        result: result,
        resultAnalysis: resultAnalysis,
        // Include file context so users know which file this executed against
        fileContext: {
          fileName: figma.root.name,
          fileKey: figma.fileKey || null
        }
      });

    } catch (error) {
      // Extract error message explicitly - don't rely on console.error serialization
      var errorName = error && error.name ? error.name : 'Error';
      var errorMsg = error && error.message ? error.message : String(error);
      var errorStack = error && error.stack ? error.stack : '';

      // Log error details as strings so they show up properly in Puppeteer
      console.error('🌉 [F-MCP ATezer Bridge] Code execution error: [' + errorName + '] ' + errorMsg);
      if (errorStack) {
        console.error('🌉 [F-MCP ATezer Bridge] Stack:', errorStack);
      }

      figma.ui.postMessage({
        type: 'EXECUTE_CODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorName + ': ' + errorMsg
      });
    }
  }

  // ============================================================================
  // UPDATE_VARIABLE - Update a variable's value in a specific mode
  // ============================================================================
  else if (msg.type === 'UPDATE_VARIABLE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Updating variable:', msg.variableId);

      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) {
        throw new Error('Variable not found: ' + msg.variableId);
      }

      // Convert value based on variable type
      var value = msg.value;

      // Check if value is a variable alias (string starting with "VariableID:")
      if (typeof value === 'string' && value.startsWith('VariableID:')) {
        // Convert to VARIABLE_ALIAS format
        value = {
          type: 'VARIABLE_ALIAS',
          id: value
        };
        console.log('🌉 [F-MCP ATezer Bridge] Converting to variable alias:', value.id);
      } else if (variable.resolvedType === 'COLOR' && typeof value === 'string') {
        // Convert hex string to Figma color
        value = hexToFigmaRGB(value);
      }

      // Set the value for the specified mode
      variable.setValueForMode(msg.modeId, value);

      console.log('🌉 [F-MCP ATezer Bridge] Variable updated successfully');

      figma.ui.postMessage({
        type: 'UPDATE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: true,
        variable: serializeVariable(variable)
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Update variable error:', error);
      figma.ui.postMessage({
        type: 'UPDATE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // CREATE_VARIABLE - Create a new variable in a collection
  // ============================================================================
  else if (msg.type === 'CREATE_VARIABLE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Creating variable:', msg.name);

      // Get the collection
      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) {
        throw new Error('Collection not found: ' + msg.collectionId);
      }

      // Create the variable
      var variable = figma.variables.createVariable(msg.name, collection, msg.resolvedType);

      // Set initial values if provided
      if (msg.valuesByMode) {
        for (var modeId in msg.valuesByMode) {
          var value = msg.valuesByMode[modeId];
          // Convert hex colors
          if (msg.resolvedType === 'COLOR' && typeof value === 'string') {
            value = hexToFigmaRGB(value);
          }
          variable.setValueForMode(modeId, value);
        }
      }

      // Set description if provided
      if (msg.description) {
        variable.description = msg.description;
      }

      // Set scopes if provided
      if (msg.scopes) {
        variable.scopes = msg.scopes;
      }

      console.log('🌉 [F-MCP ATezer Bridge] Variable created:', variable.id);

      figma.ui.postMessage({
        type: 'CREATE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: true,
        variable: serializeVariable(variable)
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Create variable error:', error);
      figma.ui.postMessage({
        type: 'CREATE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // CREATE_VARIABLE_COLLECTION - Create a new variable collection
  // ============================================================================
  else if (msg.type === 'CREATE_VARIABLE_COLLECTION') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Creating collection:', msg.name);

      // Create the collection
      var collection = figma.variables.createVariableCollection(msg.name);

      // Rename the default mode if a name is provided
      if (msg.initialModeName && collection.modes.length > 0) {
        collection.renameMode(collection.modes[0].modeId, msg.initialModeName);
      }

      // Add additional modes if provided
      if (msg.additionalModes && msg.additionalModes.length > 0) {
        for (var i = 0; i < msg.additionalModes.length; i++) {
          collection.addMode(msg.additionalModes[i]);
        }
      }

      console.log('🌉 [F-MCP ATezer Bridge] Collection created:', collection.id);

      figma.ui.postMessage({
        type: 'CREATE_VARIABLE_COLLECTION_RESULT',
        requestId: msg.requestId,
        success: true,
        collection: serializeCollection(collection)
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Create collection error:', error);
      figma.ui.postMessage({
        type: 'CREATE_VARIABLE_COLLECTION_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // DELETE_VARIABLE - Delete a variable
  // ============================================================================
  else if (msg.type === 'DELETE_VARIABLE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Deleting variable:', msg.variableId);

      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) {
        throw new Error('Variable not found: ' + msg.variableId);
      }

      var deletedInfo = {
        id: variable.id,
        name: variable.name
      };

      variable.remove();

      console.log('🌉 [F-MCP ATezer Bridge] Variable deleted');

      figma.ui.postMessage({
        type: 'DELETE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: true,
        deleted: deletedInfo
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Delete variable error:', error);
      figma.ui.postMessage({
        type: 'DELETE_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // DELETE_VARIABLE_COLLECTION - Delete a variable collection
  // ============================================================================
  else if (msg.type === 'DELETE_VARIABLE_COLLECTION') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Deleting collection:', msg.collectionId);

      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) {
        throw new Error('Collection not found: ' + msg.collectionId);
      }

      var deletedInfo = {
        id: collection.id,
        name: collection.name,
        variableCount: collection.variableIds.length
      };

      collection.remove();

      console.log('🌉 [F-MCP ATezer Bridge] Collection deleted');

      figma.ui.postMessage({
        type: 'DELETE_VARIABLE_COLLECTION_RESULT',
        requestId: msg.requestId,
        success: true,
        deleted: deletedInfo
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Delete collection error:', error);
      figma.ui.postMessage({
        type: 'DELETE_VARIABLE_COLLECTION_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // RENAME_VARIABLE - Rename a variable
  // ============================================================================
  else if (msg.type === 'RENAME_VARIABLE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Renaming variable:', msg.variableId, 'to', msg.newName);

      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) {
        throw new Error('Variable not found: ' + msg.variableId);
      }

      var oldName = variable.name;
      variable.name = msg.newName;

      console.log('🌉 [F-MCP ATezer Bridge] Variable renamed from "' + oldName + '" to "' + msg.newName + '"');

      figma.ui.postMessage({
        type: 'RENAME_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: true,
        variable: serializeVariable(variable),
        oldName: oldName
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Rename variable error:', error);
      figma.ui.postMessage({
        type: 'RENAME_VARIABLE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // ADD_MODE - Add a mode to a variable collection
  // ============================================================================
  else if (msg.type === 'ADD_MODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Adding mode to collection:', msg.collectionId);

      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) {
        throw new Error('Collection not found: ' + msg.collectionId);
      }

      // Add the mode (returns the new mode ID)
      var newModeId = collection.addMode(msg.modeName);

      console.log('🌉 [F-MCP ATezer Bridge] Mode "' + msg.modeName + '" added with ID:', newModeId);

      figma.ui.postMessage({
        type: 'ADD_MODE_RESULT',
        requestId: msg.requestId,
        success: true,
        collection: serializeCollection(collection),
        newMode: {
          modeId: newModeId,
          name: msg.modeName
        }
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Add mode error:', error);
      figma.ui.postMessage({
        type: 'ADD_MODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // RENAME_MODE - Rename a mode in a variable collection
  // ============================================================================
  else if (msg.type === 'RENAME_MODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Renaming mode:', msg.modeId, 'in collection:', msg.collectionId);

      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) {
        throw new Error('Collection not found: ' + msg.collectionId);
      }

      // Find the current mode name
      var currentMode = collection.modes.find(function(m) { return m.modeId === msg.modeId; });
      if (!currentMode) {
        throw new Error('Mode not found: ' + msg.modeId);
      }

      var oldName = currentMode.name;
      collection.renameMode(msg.modeId, msg.newName);

      console.log('🌉 [F-MCP ATezer Bridge] Mode renamed from "' + oldName + '" to "' + msg.newName + '"');

      figma.ui.postMessage({
        type: 'RENAME_MODE_RESULT',
        requestId: msg.requestId,
        success: true,
        collection: serializeCollection(collection),
        oldName: oldName
      });

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Rename mode error:', error);
      figma.ui.postMessage({
        type: 'RENAME_MODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // REFRESH_VARIABLES - Re-fetch and send all variables data
  // ============================================================================
  else if (msg.type === 'REFRESH_VARIABLES') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Refreshing variables data...');

      var variables = await figma.variables.getLocalVariablesAsync();
      var collections = await figma.variables.getLocalVariableCollectionsAsync();

      var variablesData = {
        success: true,
        timestamp: Date.now(),
        fileKey: figma.fileKey || null,
        variables: variables.map(serializeVariable),
        variableCollections: collections.map(serializeCollection)
      };

      // Update the UI's cached data
      figma.ui.postMessage({
        type: 'VARIABLES_DATA',
        data: variablesData
      });

      // Also send as a response to the request
      figma.ui.postMessage({
        type: 'REFRESH_VARIABLES_RESULT',
        requestId: msg.requestId,
        success: true,
        data: variablesData
      });

      console.log('🌉 [F-MCP ATezer Bridge] Variables refreshed:', variables.length, 'variables in', collections.length, 'collections');

    } catch (error) {
      console.error('🌉 [F-MCP ATezer Bridge] Refresh variables error:', error);
      figma.ui.postMessage({
        type: 'REFRESH_VARIABLES_RESULT',
        requestId: msg.requestId,
        success: false,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // GET_COMPONENT - Existing read operation
  // ============================================================================
  else if (msg.type === 'GET_COMPONENT') {
    try {
      console.log(`🌉 [F-MCP ATezer Bridge] Fetching component: ${msg.nodeId}`);

      const node = await figma.getNodeByIdAsync(msg.nodeId);

      if (!node) {
        throw new Error(`Node not found: ${msg.nodeId}`);
      }

      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET' && node.type !== 'INSTANCE') {
        throw new Error(`Node is not a component. Type: ${node.type}`);
      }

      // Detect if this is a variant (COMPONENT inside a COMPONENT_SET)
      // Note: Can't use optional chaining (?.) - Figma plugin sandbox doesn't support it
      const isVariant = node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET';

      // Extract component data including description fields and annotations
      const componentData = {
        success: true,
        timestamp: Date.now(),
        nodeId: msg.nodeId,
        component: {
          id: node.id,
          name: node.name,
          type: node.type,
          // Variants CAN have their own description
          description: node.description || null,
          descriptionMarkdown: node.descriptionMarkdown || null,
          visible: node.visible,
          locked: node.locked,
          // Dev Mode annotations
          annotations: node.annotations || [],
          // Flag to indicate if this is a variant
          isVariant: isVariant,
          // For component sets and non-variant components only (variants cannot access this)
          componentPropertyDefinitions: (node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && !isVariant))
            ? node.componentPropertyDefinitions
            : undefined,
          // Get children info (include text content for TEXT nodes)
          children: node.children ? node.children.map(child => {
            var c = { id: child.id, name: child.name, type: child.type };
            if (child.type === 'TEXT' && child.characters !== undefined) c.characters = child.characters;
            return c;
          }) : undefined
        }
      };

      console.log(`🌉 [F-MCP ATezer Bridge] Component data ready. Has description: ${!!componentData.component.description}, annotations: ${componentData.component.annotations.length}`);

      // Send to UI
      figma.ui.postMessage({
        type: 'COMPONENT_DATA',
        requestId: msg.requestId, // Echo back the request ID
        data: componentData
      });

    } catch (error) {
      console.error(`🌉 [F-MCP ATezer Bridge] Error fetching component:`, error);
      figma.ui.postMessage({
        type: 'COMPONENT_ERROR',
        requestId: msg.requestId,
        error: error.message || String(error)
      });
    }
  }

  // ============================================================================
  // GET_LOCAL_COMPONENTS - Get all local components for design system manifest
  // ============================================================================
  else if (msg.type === 'GET_LOCAL_COMPONENTS') {
    try {
      var currentPageOnly = msg.currentPageOnly === true;
      var limit = msg.limit != null ? Math.max(0, parseInt(msg.limit, 10) || 0) : 0;
      console.log('🌉 [F-MCP ATezer Bridge] Fetching local components (currentPageOnly:', currentPageOnly, ', limit:', limit || 'none', ')...');

      // Find all component sets and standalone components in the file
      var components = [];
      var componentSets = [];
      var hitLimit = false;

      // Helper to extract component data
      function extractComponentData(node, isPartOfSet) {
        var data = {
          key: node.key,
          nodeId: node.id,
          name: node.name,
          type: node.type,
          description: node.description || null,
          width: node.width,
          height: node.height
        };

        // Get property definitions for non-variant components
        if (!isPartOfSet && node.componentPropertyDefinitions) {
          data.properties = [];
          var propDefs = node.componentPropertyDefinitions;
          for (var propName in propDefs) {
            if (propDefs.hasOwnProperty(propName)) {
              var propDef = propDefs[propName];
              data.properties.push({
                name: propName,
                type: propDef.type,
                defaultValue: propDef.defaultValue
              });
            }
          }
        }

        return data;
      }

      // Helper to extract component set data with all variants
      function extractComponentSetData(node) {
        var variantAxes = {};
        var variants = [];

        // Parse variant properties from children names
        if (node.children) {
          node.children.forEach(function(child) {
            if (child.type === 'COMPONENT') {
              // Parse variant name (e.g., "Size=md, State=default")
              var variantProps = {};
              var parts = child.name.split(',').map(function(p) { return p.trim(); });
              parts.forEach(function(part) {
                var kv = part.split('=');
                if (kv.length === 2) {
                  var key = kv[0].trim();
                  var value = kv[1].trim();
                  variantProps[key] = value;

                  // Track all values for each axis
                  if (!variantAxes[key]) {
                    variantAxes[key] = [];
                  }
                  if (variantAxes[key].indexOf(value) === -1) {
                    variantAxes[key].push(value);
                  }
                }
              });

              variants.push({
                key: child.key,
                nodeId: child.id,
                name: child.name,
                description: child.description || null,
                variantProperties: variantProps,
                width: child.width,
                height: child.height
              });
            }
          });
        }

        // Convert variantAxes object to array format
        var axes = [];
        for (var axisName in variantAxes) {
          if (variantAxes.hasOwnProperty(axisName)) {
            axes.push({
              name: axisName,
              values: variantAxes[axisName]
            });
          }
        }

        return {
          key: node.key,
          nodeId: node.id,
          name: node.name,
          type: 'COMPONENT_SET',
          description: node.description || null,
          variantAxes: axes,
          variants: variants,
          defaultVariant: variants.length > 0 ? variants[0] : null,
          properties: node.componentPropertyDefinitions ? Object.keys(node.componentPropertyDefinitions).map(function(propName) {
            var propDef = node.componentPropertyDefinitions[propName];
            return {
              name: propName,
              type: propDef.type,
              defaultValue: propDef.defaultValue
            };
          }) : []
        };
      }

      // Use findAllWithCriteria (async-friendly, no sync tree walk) — works in dynamic-page
      async function processNodeList(nodes) {
        for (var i = 0; i < nodes.length && !hitLimit; i++) {
          if (limit > 0 && components.length + componentSets.length >= limit) {
            hitLimit = true;
            break;
          }
          var node = nodes[i];
          if (!node) continue;
          if (node.loadAsync) await node.loadAsync();
          if (node.type === 'COMPONENT_SET') {
            componentSets.push(extractComponentSetData(node));
          } else if (node.type === 'COMPONENT') {
            if (!node.parent || node.parent.type !== 'COMPONENT_SET') {
              components.push(extractComponentData(node, false));
            }
          }
        }
      }

      if (currentPageOnly) {
        var page = figma.currentPage;
        if (page) {
          await (page.loadAsync && page.loadAsync());
          var nodes = page.findAllWithCriteria ? page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }) : [];
          await processNodeList(nodes);
        }
      } else {
        console.log('🌉 [F-MCP ATezer Bridge] Loading all pages...');
        await figma.loadAllPagesAsync();
        console.log('🌉 [F-MCP ATezer Bridge] All pages loaded, searching for components...');
        var pages = figma.root.children;
        for (var p = 0; p < pages.length && !hitLimit; p++) {
          var pg = pages[p];
          if (pg && pg.loadAsync) await pg.loadAsync();
          var pageNodes = pg && pg.findAllWithCriteria ? pg.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }) : [];
          await processNodeList(pageNodes);
        }
      }

      console.log('🌉 [F-MCP ATezer Bridge] Found ' + components.length + ' components and ' + componentSets.length + ' component sets');

      figma.ui.postMessage({
        type: 'GET_LOCAL_COMPONENTS_RESULT',
        requestId: msg.requestId,
        success: true,
        data: {
          components: components,
          componentSets: componentSets,
          totalComponents: components.length,
          totalComponentSets: componentSets.length,
          currentPageOnly: currentPageOnly,
          truncatedByLimit: hitLimit && limit > 0,
          fileName: figma.root.name,
          fileKey: figma.fileKey || null,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Get local components error:', errorMsg);
      figma.ui.postMessage({
        type: 'GET_LOCAL_COMPONENTS_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // INSTANTIATE_COMPONENT - Create a component instance with overrides
  // ============================================================================
  else if (msg.type === 'INSTANTIATE_COMPONENT') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Instantiating component:', msg.componentKey || msg.nodeId);

      var component = null;
      var instance = null;

      // Try published library first (by key), then fall back to local component (by nodeId)
      if (msg.componentKey) {
        try {
          component = await figma.importComponentByKeyAsync(msg.componentKey);
        } catch (importError) {
          console.log('🌉 [F-MCP ATezer Bridge] Not a published component, trying local...');
        }
      }

      // Fall back to local component by nodeId
      if (!component && msg.nodeId) {
        var node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node) {
          if (node.type === 'COMPONENT') {
            component = node;
          } else if (node.type === 'COMPONENT_SET') {
            // For component sets, find the right variant or use default
            if (msg.variant && node.children && node.children.length > 0) {
              // Build variant name from properties (e.g., "Type=Simple, State=Default")
              var variantParts = [];
              for (var prop in msg.variant) {
                if (msg.variant.hasOwnProperty(prop)) {
                  variantParts.push(prop + '=' + msg.variant[prop]);
                }
              }
              var targetVariantName = variantParts.join(', ');
              console.log('🌉 [F-MCP ATezer Bridge] Looking for variant:', targetVariantName);

              // Find matching variant
              for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                if (child.type === 'COMPONENT' && child.name === targetVariantName) {
                  component = child;
                  console.log('🌉 [F-MCP ATezer Bridge] Found exact variant match');
                  break;
                }
              }

              // If no exact match, try partial match
              if (!component) {
                for (var i = 0; i < node.children.length; i++) {
                  var child = node.children[i];
                  if (child.type === 'COMPONENT') {
                    var matches = true;
                    for (var prop in msg.variant) {
                      if (msg.variant.hasOwnProperty(prop)) {
                        var expected = prop + '=' + msg.variant[prop];
                        if (child.name.indexOf(expected) === -1) {
                          matches = false;
                          break;
                        }
                      }
                    }
                    if (matches) {
                      component = child;
                      console.log('🌉 [F-MCP ATezer Bridge] Found partial variant match:', child.name);
                      break;
                    }
                  }
                }
              }
            }

            // Default to first variant if no match
            if (!component && node.children && node.children.length > 0) {
              component = node.children[0];
              console.log('🌉 [F-MCP ATezer Bridge] Using default variant:', component.name);
            }
          }
        }
      }

      if (!component) {
        // Build detailed error message with actionable guidance
        var errorParts = ['Component not found.'];

        if (msg.componentKey) {
          errorParts.push('Published component key "' + msg.componentKey + '" could not be imported - it may have been unpublished or deleted from the library.');
        }

        if (msg.nodeId) {
          errorParts.push('Local nodeId "' + msg.nodeId + '" does not exist in this file - nodeIds are session-specific and may be stale.');
        }

        if (!msg.componentKey && !msg.nodeId) {
          errorParts.push('No componentKey or nodeId was provided.');
        }

        errorParts.push('SUGGESTION: Use figma_search_components to get current component identifiers before instantiating.');

        throw new Error(errorParts.join(' '));
      }

      // Create the instance
      instance = component.createInstance();

      // Apply position if specified
      if (msg.position) {
        instance.x = msg.position.x || 0;
        instance.y = msg.position.y || 0;
      }

      // Apply size override if specified
      if (msg.size) {
        instance.resize(msg.size.width, msg.size.height);
      }

      // Apply property overrides
      if (msg.overrides) {
        for (var propName in msg.overrides) {
          if (msg.overrides.hasOwnProperty(propName)) {
            try {
              instance.setProperties({ [propName]: msg.overrides[propName] });
            } catch (propError) {
              console.warn('🌉 [F-MCP ATezer Bridge] Could not set property ' + propName + ':', propError.message);
            }
          }
        }
      }

      // Apply variant selection if specified
      if (msg.variant) {
        try {
          instance.setProperties(msg.variant);
        } catch (variantError) {
          console.warn('🌉 [F-MCP ATezer Bridge] Could not set variant:', variantError.message);
        }
      }

      // Append to parent if specified
      if (msg.parentId) {
        var parent = await figma.getNodeByIdAsync(msg.parentId);
        if (parent && 'appendChild' in parent) {
          parent.appendChild(instance);
        }
      }

      console.log('🌉 [F-MCP ATezer Bridge] Component instantiated:', instance.id);

      figma.ui.postMessage({
        type: 'INSTANTIATE_COMPONENT_RESULT',
        requestId: msg.requestId,
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          x: instance.x,
          y: instance.y,
          width: instance.width,
          height: instance.height
        }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Instantiate component error:', errorMsg);
      figma.ui.postMessage({
        type: 'INSTANTIATE_COMPONENT_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_NODE_DESCRIPTION - Set description on component/style
  // ============================================================================
  else if (msg.type === 'SET_NODE_DESCRIPTION') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting description on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      // Check if node supports description
      if (!('description' in node)) {
        throw new Error('Node type ' + node.type + ' does not support description');
      }

      // Set description (and markdown if supported)
      node.description = msg.description || '';
      if (msg.descriptionMarkdown && 'descriptionMarkdown' in node) {
        node.descriptionMarkdown = msg.descriptionMarkdown;
      }

      console.log('🌉 [F-MCP ATezer Bridge] Description set successfully');

      figma.ui.postMessage({
        type: 'SET_NODE_DESCRIPTION_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, description: node.description }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set description error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_NODE_DESCRIPTION_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // ADD_COMPONENT_PROPERTY - Add property to component
  // ============================================================================
  else if (msg.type === 'ADD_COMPONENT_PROPERTY') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Adding component property:', msg.propertyName, 'type:', msg.propertyType);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
        throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      }

      // Check if it's a variant (can't add properties to variants)
      if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
        throw new Error('Cannot add properties to variant components. Add to the parent COMPONENT_SET instead.');
      }

      // Build options if preferredValues provided
      var options = undefined;
      if (msg.preferredValues) {
        options = { preferredValues: msg.preferredValues };
      }

      // Use msg.propertyType (not msg.type which is the message type 'ADD_COMPONENT_PROPERTY')
      var propertyNameWithId = node.addComponentProperty(msg.propertyName, msg.propertyType, msg.defaultValue, options);

      console.log('🌉 [F-MCP ATezer Bridge] Property added:', propertyNameWithId);

      figma.ui.postMessage({
        type: 'ADD_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: true,
        propertyName: propertyNameWithId
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Add component property error:', errorMsg);
      figma.ui.postMessage({
        type: 'ADD_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // EDIT_COMPONENT_PROPERTY - Edit existing component property
  // ============================================================================
  else if (msg.type === 'EDIT_COMPONENT_PROPERTY') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Editing component property:', msg.propertyName);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
        throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      }

      var propertyNameWithId = node.editComponentProperty(msg.propertyName, msg.newValue);

      console.log('🌉 [F-MCP ATezer Bridge] Property edited:', propertyNameWithId);

      figma.ui.postMessage({
        type: 'EDIT_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: true,
        propertyName: propertyNameWithId
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Edit component property error:', errorMsg);
      figma.ui.postMessage({
        type: 'EDIT_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // DELETE_COMPONENT_PROPERTY - Delete a component property
  // ============================================================================
  else if (msg.type === 'DELETE_COMPONENT_PROPERTY') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Deleting component property:', msg.propertyName);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
        throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      }

      node.deleteComponentProperty(msg.propertyName);

      console.log('🌉 [F-MCP ATezer Bridge] Property deleted');

      figma.ui.postMessage({
        type: 'DELETE_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: true
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Delete component property error:', errorMsg);
      figma.ui.postMessage({
        type: 'DELETE_COMPONENT_PROPERTY_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // RESIZE_NODE - Resize any node
  // ============================================================================
  else if (msg.type === 'RESIZE_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Resizing node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('resize' in node)) {
        throw new Error('Node type ' + node.type + ' does not support resize');
      }

      if (msg.withConstraints) {
        node.resize(msg.width, msg.height);
      } else {
        node.resizeWithoutConstraints(msg.width, msg.height);
      }

      console.log('🌉 [F-MCP ATezer Bridge] Node resized to:', msg.width, 'x', msg.height);

      figma.ui.postMessage({
        type: 'RESIZE_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, width: node.width, height: node.height }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Resize node error:', errorMsg);
      figma.ui.postMessage({
        type: 'RESIZE_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // MOVE_NODE - Move/position a node
  // ============================================================================
  else if (msg.type === 'MOVE_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Moving node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('x' in node)) {
        throw new Error('Node type ' + node.type + ' does not support positioning');
      }

      node.x = msg.x;
      node.y = msg.y;

      console.log('🌉 [F-MCP ATezer Bridge] Node moved to:', msg.x, ',', msg.y);

      figma.ui.postMessage({
        type: 'MOVE_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, x: node.x, y: node.y }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Move node error:', errorMsg);
      figma.ui.postMessage({
        type: 'MOVE_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_NODE_FILLS - Set fills (colors) on a node
  // ============================================================================
  else if (msg.type === 'SET_NODE_FILLS') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting fills on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('fills' in node)) {
        throw new Error('Node type ' + node.type + ' does not support fills');
      }

      // Process fills - convert hex colors if needed
      var processedFills = msg.fills.map(function(fill) {
        if (fill.type === 'SOLID' && typeof fill.color === 'string') {
          // Convert hex to RGB
          var rgb = hexToFigmaRGB(fill.color);
          return {
            type: 'SOLID',
            color: { r: rgb.r, g: rgb.g, b: rgb.b },
            opacity: rgb.a !== undefined ? rgb.a : (fill.opacity !== undefined ? fill.opacity : 1)
          };
        }
        return fill;
      });

      node.fills = processedFills;

      console.log('🌉 [F-MCP ATezer Bridge] Fills set successfully');

      figma.ui.postMessage({
        type: 'SET_NODE_FILLS_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set fills error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_NODE_FILLS_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_NODE_STROKES - Set strokes on a node
  // ============================================================================
  else if (msg.type === 'SET_NODE_STROKES') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting strokes on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('strokes' in node)) {
        throw new Error('Node type ' + node.type + ' does not support strokes');
      }

      // Process strokes - convert hex colors if needed
      var processedStrokes = msg.strokes.map(function(stroke) {
        if (stroke.type === 'SOLID' && typeof stroke.color === 'string') {
          var rgb = hexToFigmaRGB(stroke.color);
          return {
            type: 'SOLID',
            color: { r: rgb.r, g: rgb.g, b: rgb.b },
            opacity: rgb.a !== undefined ? rgb.a : (stroke.opacity !== undefined ? stroke.opacity : 1)
          };
        }
        return stroke;
      });

      node.strokes = processedStrokes;

      if (msg.strokeWeight !== undefined) {
        node.strokeWeight = msg.strokeWeight;
      }

      console.log('🌉 [F-MCP ATezer Bridge] Strokes set successfully');

      figma.ui.postMessage({
        type: 'SET_NODE_STROKES_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set strokes error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_NODE_STROKES_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_NODE_OPACITY - Set opacity on a node
  // ============================================================================
  else if (msg.type === 'SET_NODE_OPACITY') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting opacity on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('opacity' in node)) {
        throw new Error('Node type ' + node.type + ' does not support opacity');
      }

      node.opacity = Math.max(0, Math.min(1, msg.opacity));

      console.log('🌉 [F-MCP ATezer Bridge] Opacity set to:', node.opacity);

      figma.ui.postMessage({
        type: 'SET_NODE_OPACITY_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, opacity: node.opacity }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set opacity error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_NODE_OPACITY_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_NODE_CORNER_RADIUS - Set corner radius on a node
  // ============================================================================
  else if (msg.type === 'SET_NODE_CORNER_RADIUS') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting corner radius on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('cornerRadius' in node)) {
        throw new Error('Node type ' + node.type + ' does not support corner radius');
      }

      node.cornerRadius = msg.radius;

      console.log('🌉 [F-MCP ATezer Bridge] Corner radius set to:', msg.radius);

      figma.ui.postMessage({
        type: 'SET_NODE_CORNER_RADIUS_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, cornerRadius: node.cornerRadius }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set corner radius error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_NODE_CORNER_RADIUS_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // CLONE_NODE - Clone/duplicate a node
  // ============================================================================
  else if (msg.type === 'CLONE_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Cloning node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (!('clone' in node)) {
        throw new Error('Node type ' + node.type + ' does not support cloning');
      }

      var clonedNode = node.clone();

      console.log('🌉 [F-MCP ATezer Bridge] Node cloned:', clonedNode.id);

      figma.ui.postMessage({
        type: 'CLONE_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: clonedNode.id, name: clonedNode.name, x: clonedNode.x, y: clonedNode.y }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Clone node error:', errorMsg);
      figma.ui.postMessage({
        type: 'CLONE_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // DELETE_NODE - Delete a node
  // ============================================================================
  else if (msg.type === 'DELETE_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Deleting node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      var deletedInfo = { id: node.id, name: node.name };

      node.remove();

      console.log('🌉 [F-MCP ATezer Bridge] Node deleted');

      figma.ui.postMessage({
        type: 'DELETE_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        deleted: deletedInfo
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Delete node error:', errorMsg);
      figma.ui.postMessage({
        type: 'DELETE_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // RENAME_NODE - Rename a node
  // ============================================================================
  else if (msg.type === 'RENAME_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Renaming node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      var oldName = node.name;
      node.name = msg.newName;

      console.log('🌉 [F-MCP ATezer Bridge] Node renamed from "' + oldName + '" to "' + msg.newName + '"');

      figma.ui.postMessage({
        type: 'RENAME_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, oldName: oldName }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Rename node error:', errorMsg);
      figma.ui.postMessage({
        type: 'RENAME_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_TEXT_CONTENT - Set text on a text node
  // ============================================================================
  else if (msg.type === 'SET_TEXT_CONTENT') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting text content on node:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (node.type !== 'TEXT') {
        throw new Error('Node must be a TEXT node. Got: ' + node.type);
      }

      // Load the font first
      await figma.loadFontAsync(node.fontName);

      node.characters = msg.text;

      // Apply font properties if specified
      if (msg.fontSize) {
        node.fontSize = msg.fontSize;
      }

      console.log('🌉 [F-MCP ATezer Bridge] Text content set');

      figma.ui.postMessage({
        type: 'SET_TEXT_CONTENT_RESULT',
        requestId: msg.requestId,
        success: true,
        node: { id: node.id, name: node.name, characters: node.characters }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set text content error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_TEXT_CONTENT_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // CREATE_CHILD_NODE - Create a new child node
  // ============================================================================
  else if (msg.type === 'CREATE_CHILD_NODE') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Creating child node of type:', msg.nodeType);

      var parent = await figma.getNodeByIdAsync(msg.parentId);
      if (!parent) {
        throw new Error('Parent node not found: ' + msg.parentId);
      }

      if (!('appendChild' in parent)) {
        throw new Error('Parent node type ' + parent.type + ' does not support children');
      }

      var newNode;
      var props = msg.properties || {};

      switch (msg.nodeType) {
        case 'RECTANGLE':
          newNode = figma.createRectangle();
          break;
        case 'ELLIPSE':
          newNode = figma.createEllipse();
          break;
        case 'FRAME':
          newNode = figma.createFrame();
          break;
        case 'TEXT':
          newNode = figma.createText();
          // Load default font
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          newNode.fontName = { family: 'Inter', style: 'Regular' };
          if (props.text) {
            newNode.characters = props.text;
          }
          break;
        case 'LINE':
          newNode = figma.createLine();
          break;
        case 'POLYGON':
          newNode = figma.createPolygon();
          break;
        case 'STAR':
          newNode = figma.createStar();
          break;
        case 'VECTOR':
          newNode = figma.createVector();
          break;
        default:
          throw new Error('Unsupported node type: ' + msg.nodeType);
      }

      // Apply common properties
      if (props.name) newNode.name = props.name;
      if (props.x !== undefined) newNode.x = props.x;
      if (props.y !== undefined) newNode.y = props.y;
      if (props.width !== undefined && props.height !== undefined) {
        newNode.resize(props.width, props.height);
      }

      // Apply fills if specified
      if (props.fills) {
        var processedFills = props.fills.map(function(fill) {
          if (fill.type === 'SOLID' && typeof fill.color === 'string') {
            var rgb = hexToFigmaRGB(fill.color);
            return {
              type: 'SOLID',
              color: { r: rgb.r, g: rgb.g, b: rgb.b },
              opacity: rgb.a !== undefined ? rgb.a : 1
            };
          }
          return fill;
        });
        newNode.fills = processedFills;
      }

      // Add to parent
      parent.appendChild(newNode);

      console.log('🌉 [F-MCP ATezer Bridge] Child node created:', newNode.id);

      figma.ui.postMessage({
        type: 'CREATE_CHILD_NODE_RESULT',
        requestId: msg.requestId,
        success: true,
        node: {
          id: newNode.id,
          name: newNode.name,
          type: newNode.type,
          x: newNode.x,
          y: newNode.y,
          width: newNode.width,
          height: newNode.height
        }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Create child node error:', errorMsg);
      figma.ui.postMessage({
        type: 'CREATE_CHILD_NODE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // CAPTURE_SCREENSHOT - Capture node screenshot using plugin exportAsync
  // This captures the CURRENT plugin runtime state (not cloud state like REST API)
  // ============================================================================
  else if (msg.type === 'CAPTURE_SCREENSHOT') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Capturing screenshot for node:', msg.nodeId);

      var node = msg.nodeId ? await figma.getNodeByIdAsync(msg.nodeId) : figma.currentPage;
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      // Verify node supports export
      if (!('exportAsync' in node)) {
        throw new Error('Node type ' + node.type + ' does not support export');
      }

      // Configure export settings
      var format = msg.format || 'PNG';
      var scale = msg.scale || 2;

      var exportSettings = {
        format: format,
        constraint: { type: 'SCALE', value: scale }
      };

      // Export the node
      var bytes = await node.exportAsync(exportSettings);

      // Convert to base64
      var base64 = figma.base64Encode(bytes);

      // Get node bounds for context
      var bounds = null;
      if ('absoluteBoundingBox' in node) {
        bounds = node.absoluteBoundingBox;
      }

      console.log('🌉 [F-MCP ATezer Bridge] Screenshot captured:', bytes.length, 'bytes');

      figma.ui.postMessage({
        type: 'CAPTURE_SCREENSHOT_RESULT',
        requestId: msg.requestId,
        success: true,
        image: {
          base64: base64,
          format: format,
          scale: scale,
          byteLength: bytes.length,
          node: {
            id: node.id,
            name: node.name,
            type: node.type
          },
          bounds: bounds
        }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Screenshot capture error:', errorMsg);
      figma.ui.postMessage({
        type: 'CAPTURE_SCREENSHOT_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // SET_INSTANCE_PROPERTIES - Update component properties on an instance
  // Uses instance.setProperties() to update TEXT, BOOLEAN, INSTANCE_SWAP, VARIANT
  // ============================================================================
  else if (msg.type === 'SET_INSTANCE_PROPERTIES') {
    try {
      console.log('🌉 [F-MCP ATezer Bridge] Setting instance properties on:', msg.nodeId);

      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) {
        throw new Error('Node not found: ' + msg.nodeId);
      }

      if (node.type !== 'INSTANCE') {
        throw new Error('Node must be an INSTANCE. Got: ' + node.type);
      }

      // Get current properties for reference
      var currentProps = node.componentProperties;
      console.log('🌉 [F-MCP ATezer Bridge] Current properties:', JSON.stringify(Object.keys(currentProps)));

      // Build the properties object
      // Note: TEXT, BOOLEAN, INSTANCE_SWAP properties use the format "PropertyName#nodeId"
      // VARIANT properties use just "PropertyName"
      var propsToSet = {};
      var propUpdates = msg.properties || {};

      for (var propName in propUpdates) {
        var newValue = propUpdates[propName];

        // Check if this exact property name exists
        if (currentProps[propName] !== undefined) {
          propsToSet[propName] = newValue;
          console.log('🌉 [F-MCP ATezer Bridge] Setting property:', propName, '=', newValue);
        } else {
          // Try to find a matching property with a suffix (for TEXT/BOOLEAN/INSTANCE_SWAP)
          var foundMatch = false;
          for (var existingProp in currentProps) {
            // Check if this is the base property name with a node ID suffix
            if (existingProp.startsWith(propName + '#')) {
              propsToSet[existingProp] = newValue;
              console.log('🌉 [F-MCP ATezer Bridge] Found suffixed property:', existingProp, '=', newValue);
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            console.warn('🌉 [F-MCP ATezer Bridge] Property not found:', propName, '- Available:', Object.keys(currentProps).join(', '));
          }
        }
      }

      if (Object.keys(propsToSet).length === 0) {
        throw new Error('No valid properties to set. Available properties: ' + Object.keys(currentProps).join(', '));
      }

      // Apply the properties
      node.setProperties(propsToSet);

      // Get updated properties
      var updatedProps = node.componentProperties;

      console.log('🌉 [F-MCP ATezer Bridge] Instance properties updated');

      figma.ui.postMessage({
        type: 'SET_INSTANCE_PROPERTIES_RESULT',
        requestId: msg.requestId,
        success: true,
        instance: {
          id: node.id,
          name: node.name,
          componentId: node.mainComponent ? node.mainComponent.id : null,
          propertiesSet: Object.keys(propsToSet),
          currentProperties: Object.keys(updatedProps).reduce(function(acc, key) {
            acc[key] = {
              type: updatedProps[key].type,
              value: updatedProps[key].value
            };
            return acc;
          }, {})
        }
      });

    } catch (error) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('🌉 [F-MCP ATezer Bridge] Set instance properties error:', errorMsg);
      figma.ui.postMessage({
        type: 'SET_INSTANCE_PROPERTIES_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg
      });
    }
  }

  // ============================================================================
  // GET_DOCUMENT_STRUCTURE - File tree without REST API (token-friendly)
  // ============================================================================
  else if (msg.type === 'GET_DOCUMENT_STRUCTURE') {
    try {
      await figma.loadAllPagesAsync();

      var depth = Math.min(Math.max(msg.depth || 1, 0), 3);
      var verbosity = msg.verbosity || 'summary';
      var opts = {
        verbosity: verbosity,
        includeLayout: msg.includeLayout === true,
        includeVisual: msg.includeVisual === true,
        includeTypography: msg.includeTypography === true,
        includeCodeReady: msg.includeCodeReady !== false,
        outputHint: msg.outputHint || null
      };

      var document = {
        name: figma.root.name,
        id: figma.root.id,
        type: 'DOCUMENT',
        fileKey: figma.fileKey || null,
        children: figma.root.children ? (await Promise.all(figma.root.children.map(function(p) { return buildNodePayload(p, 1, depth, opts); }))).filter(Boolean) : []
      };

      figma.ui.postMessage({
        type: 'GET_DOCUMENT_STRUCTURE_RESULT',
        requestId: msg.requestId,
        success: true,
        data: { document: document, fileKey: figma.fileKey, fileName: figma.root.name }
      });
    } catch (error) {
      var errMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'GET_DOCUMENT_STRUCTURE_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errMsg
      });
    }
  }

  // ============================================================================
  // GET_NODE_CONTEXT - Subtree for one node with text content (token-efficient design context)
  // ============================================================================
  else if (msg.type === 'GET_NODE_CONTEXT') {
    try {
      var nodeId = msg.nodeId;
      if (!nodeId) {
        figma.ui.postMessage({
          type: 'GET_NODE_CONTEXT_RESULT',
          requestId: msg.requestId,
          success: false,
          error: 'nodeId is required'
        });
      } else {
        var targetNode = await figma.getNodeByIdAsync(nodeId);
        if (!targetNode) {
          figma.ui.postMessage({
            type: 'GET_NODE_CONTEXT_RESULT',
            requestId: msg.requestId,
            success: false,
            error: 'Node not found: ' + nodeId
          });
        } else {
          var depthNode = Math.min(Math.max(msg.depth || 2, 0), 3);
          var verbosityNode = msg.verbosity || 'standard';
          var optsNode = {
            verbosity: verbosityNode,
            includeLayout: msg.includeLayout === true,
            includeVisual: msg.includeVisual === true,
            includeTypography: msg.includeTypography === true,
            includeCodeReady: msg.includeCodeReady !== false,
            outputHint: msg.outputHint || null
          };

          var nodeTree = await buildNodePayload(targetNode, 0, depthNode, optsNode);
          figma.ui.postMessage({
            type: 'GET_NODE_CONTEXT_RESULT',
            requestId: msg.requestId,
            success: true,
            data: {
              node: nodeTree,
              fileKey: figma.fileKey || null,
              fileName: figma.root.name
            }
          });
        }
      }
    } catch (error) {
      var errMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'GET_NODE_CONTEXT_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errMsg
      });
    }
  }

  // ============================================================================
  // GET_CONSOLE_LOGS - Plugin console buffer (no CDP)
  else if (msg.type === 'GET_CONSOLE_LOGS') {
    var limit = Math.min(Math.max(1, parseInt(msg.limit, 10) || 50), 200);
    var slice = __consoleLogBuffer.slice(-limit);
    figma.ui.postMessage({
      type: 'CONSOLE_LOGS_RESULT',
      requestId: msg.requestId,
      success: true,
      data: { logs: slice, total: __consoleLogBuffer.length }
    });
  }
  else if (msg.type === 'CLEAR_CONSOLE') {
    __consoleLogBuffer.length = 0;
    figma.ui.postMessage({
      type: 'CLEAR_CONSOLE_RESULT',
      requestId: msg.requestId,
      success: true
    });
  }

  // BATCH_CREATE_VARIABLES - Up to 100 variables, partial success
  else if (msg.type === 'BATCH_CREATE_VARIABLES') {
    var items = msg.items || [];
    if (items.length > 100) items = items.slice(0, 100);
    var created = [], failed = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      try {
        var coll = await figma.variables.getVariableCollectionByIdAsync(it.collectionId);
        if (!coll) throw new Error('Collection not found');
        var valuesByMode = {};
        if (it.modeId != null && it.value !== undefined) valuesByMode[it.modeId] = it.value;
        else if (it.valuesByMode) valuesByMode = it.valuesByMode;
        var v = figma.variables.createVariable(it.name, coll, it.resolvedType);
        if (Object.keys(valuesByMode).length) {
          var modeId = it.modeId || Object.keys(valuesByMode)[0];
          if (modeId) v.setValueForMode(modeId, valuesByMode[modeId]);
        }
        created.push({ name: it.name, id: v.id });
      } catch (e) {
        failed.push({ name: it.name, error: e.message || String(e) });
      }
    }
    figma.ui.postMessage({
      type: 'BATCH_CREATE_VARIABLES_RESULT',
      requestId: msg.requestId,
      success: true,
      data: { created, failed }
    });
  }

  // BATCH_UPDATE_VARIABLES - Up to 100 updates, partial success
  else if (msg.type === 'BATCH_UPDATE_VARIABLES') {
    var updates = msg.items || [];
    if (updates.length > 100) updates = updates.slice(0, 100);
    var updated = [], failed = [];
    for (var j = 0; j < updates.length; j++) {
      var u = updates[j];
      try {
        var variable = await figma.variables.getVariableByIdAsync(u.variableId);
        if (!variable) throw new Error('Variable not found');
        variable.setValueForMode(u.modeId, u.value);
        updated.push({ variableId: u.variableId });
      } catch (e) {
        failed.push({ variableId: u.variableId, error: e.message || String(e) });
      }
    }
    figma.ui.postMessage({
      type: 'BATCH_UPDATE_VARIABLES_RESULT',
      requestId: msg.requestId,
      success: true,
      data: { updated, failed }
    });
  }

  // SETUP_DESIGN_TOKENS - Atomic: collection + modes + variables; rollback on error
  else if (msg.type === 'SETUP_DESIGN_TOKENS') {
    var collectionName = msg.collectionName || 'Design Tokens';
    var modes = msg.modes || ['Default'];
    var tokens = msg.tokens || [];
    var createdVarIds = [];
    var collection = null;
    try {
      collection = figma.variables.createVariableCollection(collectionName);
      if (modes.length > 1) {
        for (var m = 1; m < modes.length; m++) collection.addMode(modes[m]);
      }
      var defaultModeId = collection.modes[0].modeId;
      for (var t = 0; t < tokens.length; t++) {
        var tok = tokens[t];
        var name = typeof tok === 'object' ? tok.name : String(tok);
        var type = (typeof tok === 'object' ? tok.type : null) || 'STRING';
        var values = (typeof tok === 'object' && tok.values) ? tok.values : (typeof tok === 'object' ? tok.value : undefined);
        var valsByMode = typeof values === 'object' && !Array.isArray(values) ? values : { [defaultModeId]: values };
        var variable = figma.variables.createVariable(name, collection, type);
        for (var mid in valsByMode) variable.setValueForMode(mid, valsByMode[mid]);
        createdVarIds.push(variable.id);
      }
      figma.ui.postMessage({
        type: 'SETUP_DESIGN_TOKENS_RESULT',
        requestId: msg.requestId,
        success: true,
        data: { collectionId: collection.id, collectionName: collection.name, variableIds: createdVarIds, modeCount: modes.length }
      });
    } catch (err) {
      if (collection) {
        for (var d = 0; d < createdVarIds.length; d++) {
          try {
            var vv = await figma.variables.getVariableByIdAsync(createdVarIds[d]);
            if (vv) vv.remove();
          } catch (ignore) {}
        }
        try { collection.remove(); } catch (ignore) {}
      }
      figma.ui.postMessage({
        type: 'SETUP_DESIGN_TOKENS_RESULT',
        requestId: msg.requestId,
        success: false,
        error: err.message || String(err)
      });
    }
  }

  // ARRANGE_COMPONENT_SET - combineAsVariants
  else if (msg.type === 'ARRANGE_COMPONENT_SET') {
    try {
      var nodeIds = msg.nodeIds || [];
      if (nodeIds.length < 2) {
        throw new Error('At least 2 component node IDs required');
      }
      var nodes = [];
      var parent = null;
      for (var n = 0; n < nodeIds.length; n++) {
        var nd = figma.getNodeById(nodeIds[n]);
        if (!nd) throw new Error('Node not found: ' + nodeIds[n]);
        if (nd.type !== 'COMPONENT') throw new Error('Node is not a COMPONENT: ' + nodeIds[n]);
        nodes.push(nd);
        if (!parent) parent = nd.parent;
      }
      if (!parent || !parent.appendChild) throw new Error('Parent does not support children');
      var componentSet = figma.combineAsVariants(nodes, parent);
      figma.ui.postMessage({
        type: 'ARRANGE_COMPONENT_SET_RESULT',
        requestId: msg.requestId,
        success: true,
        data: { nodeId: componentSet.id, name: componentSet.name }
      });
    } catch (err) {
      figma.ui.postMessage({
        type: 'ARRANGE_COMPONENT_SET_RESULT',
        requestId: msg.requestId,
        success: false,
        error: err.message || String(err)
      });
    }
  }

  // GET_LOCAL_STYLES - Paint, text, effect styles without REST API
  // ============================================================================
  else if (msg.type === 'GET_LOCAL_STYLES') {
    try {
      var verbosity = msg.verbosity || 'summary';
      var paints = await figma.getLocalPaintStylesAsync();
      var texts = await figma.getLocalTextStylesAsync();
      var effects = await figma.getLocalEffectStylesAsync();

      function styleToSummary(s) {
        return { id: s.id, name: s.name };
      }
      function styleToFull(s) {
        var o = { id: s.id, name: s.name, description: s.description || '' };
        if (s.paints) o.paints = s.paints;
        if (s.fontName) o.fontName = s.fontName;
        if (s.fontSize !== undefined) o.fontSize = s.fontSize;
        if (s.effects) o.effects = s.effects;
        return o;
      }

      var mapFn = verbosity === 'full' ? styleToFull : styleToSummary;

      figma.ui.postMessage({
        type: 'GET_LOCAL_STYLES_RESULT',
        requestId: msg.requestId,
        success: true,
        data: {
          paintStyles: paints.map(mapFn),
          textStyles: texts.map(mapFn),
          effectStyles: effects.map(mapFn)
        }
      });
    } catch (error) {
      var errMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'GET_LOCAL_STYLES_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errMsg
      });
    }
  }
};

console.log('🌉 [F-MCP ATezer Bridge] Ready to handle component requests');
console.log('🌉 [F-MCP ATezer Bridge] Plugin will stay open until manually closed');

// Plugin stays open - no auto-close
// UI iframe remains accessible for Puppeteer to read data from window object
