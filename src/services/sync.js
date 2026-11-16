// /src/services/sync.js
import { createClient } from '@supabase/supabase-js'; // Requires: npm install @supabase/supabase-js
import { getDB, setApplyingRemoteUpdate, saveDB, getCurrentUser } from './store.js';

const CLIENT_INSTANCE_ID = 'CLIENT_' + Math.random().toString(36).substring(2, 9);
let supabaseClient = null;
let realtimeChannel = null;
let isPushingToCloud = false;
let pushSyncDebounceTimer = null;

// Helper to get UAE Time formatting
export const getUAEISOString = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000+04:00`;
};

// Merges incoming WebSocket data into our local Store
export const applyIncomingCloudState = (remoteData, onUpdateReady) => {
    if (!remoteData || !Array.isArray(remoteData.users) || remoteData.users.length === 0) return false;
    
    // Ignore updates that this exact client just pushed
    if (remoteData._lastUpdatedBy === CLIENT_INSTANCE_ID) return false;

    setApplyingRemoteUpdate(true);
    try {
        const db = getDB();
        Object.assign(db, remoteData); // Safely merge the state
        
        // Ensure array safety
        db.vendorPayments = db.vendorPayments || []; 
        db.vendorSettlementOtps = db.vendorSettlementOtps || [];
        db.agentExpenses = db.agentExpenses || [];
        if (!db.settings) db.settings = { showCloudSyncConfig: true };
        if (!db.settings.invoiceCounter) db.settings.invoiceCounter = 1001;
        
        db.consignments.forEach(c => { 
            if(!c.feeType) c.feeType = 'COD'; 
            if(typeof c.weight === 'undefined') c.weight = 1;
            if(typeof c.pieces === 'undefined') c.pieces = 1;
            if(typeof c.cocPendingAmount === 'undefined') c.cocPendingAmount = 0;
            if(typeof c.cocStatus === 'undefined') c.cocStatus = null;
            if(typeof c.pickedUpBy === 'undefined') c.pickedUpBy = null;
            if(typeof c.deficitReceivedDate === 'undefined') c.deficitReceivedDate = null;
        });
        
        // Save silently without triggering another push
        saveDB(); 
        
        const currentUser = getCurrentUser();
        if (currentUser) {
            const u = db.users.find(x => x.id === currentUser.id || x.username.toLowerCase() === currentUser.username.toLowerCase());
            if (u && u.status !== 'ACTIVE') { 
                return { action: 'LOGOUT', reason: 'Account Deactivated' };
            } 
        }
        
        // Tell the UI it needs to re-render
        if (onUpdateReady) onUpdateReady();

    } finally { 
        setApplyingRemoteUpdate(false); 
    } 
    return { action: 'UPDATED' };
};

// Debounced push to Supabase
export const pushLocalDBToCloud = (db, onStatusChange) => {
    if (!supabaseClient || !db) return;
    clearTimeout(pushSyncDebounceTimer);
    
    if (onStatusChange) onStatusChange('SYNCING', 'Syncing...');

    pushSyncDebounceTimer = setTimeout(async () => {
        isPushingToCloud = true;
        try {
            const payload = JSON.parse(JSON.stringify(db));
            payload._lastUpdatedBy = CLIENT_INSTANCE_ID;
            
            const { error } = await supabaseClient.from('app_data').upsert({ 
                id: 'nextway_state', 
                data: payload, 
                updated_at: getUAEISOString() 
            });
            
            if (error && onStatusChange) onStatusChange('ERROR', 'Sync Error');
            else if (onStatusChange) onStatusChange('LIVE', 'Live Sync');
        } catch (err) { 
            if (onStatusChange) onStatusChange('ERROR', 'Sync Error');
        } finally { 
            setTimeout(() => { isPushingToCloud = false; }, 400); 
        }
    }, 300);
};

// Initializes the connection and WebSocket listeners
export const initSupabase = async (supabaseUrl, supabaseKey, onStatusChange, onUpdateReady) => {
    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'OFFLINE') {
        if (onStatusChange) onStatusChange('ERROR', 'Offline Mode');
        return;
    }

    try {
        supabaseClient = createClient(supabaseUrl, supabaseKey);
        if (onStatusChange) onStatusChange('SYNCING', 'Connecting...');

        // Fetch initial state
        const { data, error } = await supabaseClient
            .from('app_data')
            .select('data')
            .eq('id', 'nextway_state')
            .maybeSingle();

        if (data && data.data) { 
            applyIncomingCloudState(data.data, onUpdateReady); 
            if (onStatusChange) onStatusChange('LIVE', 'Live Sync'); 
        } else if (!error && !data) { 
            pushLocalDBToCloud(getDB(), onStatusChange); 
        }

        // Setup real-time listeners
        if (realtimeChannel) realtimeChannel.unsubscribe();
        
        realtimeChannel = supabaseClient.channel('public:app_data')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.nextway_state' }, (payload) => {
                if (isPushingToCloud) return;
                if (payload.new && payload.new.data) { 
                    const result = applyIncomingCloudState(payload.new.data, onUpdateReady); 
                    if (result.action === 'UPDATED' && onStatusChange) onStatusChange('LIVE', 'Live Sync'); 
                }
            }).subscribe((status) => {
                if (status === 'SUBSCRIBED') { if (onStatusChange) onStatusChange('LIVE', 'Live Sync'); } 
                else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') { if (onStatusChange) onStatusChange('ERROR', 'Sync Error'); } 
                else if (status === 'CLOSED') { if (onStatusChange) onStatusChange('ERROR', 'Offline'); }
            });
    } catch (e) { 
        if (onStatusChange) onStatusChange('ERROR', 'DB Error'); 
    }
};

// Image Upload Helper
export const uploadImageToSupabase = async (base64Str, filename) => {
    if(!supabaseClient) return base64Str;
    try { 
        const res = await fetch(base64Str); 
        const blob = await res.blob(); 
        const { data, error } = await supabaseClient.storage.from('nextway-assets').upload(filename, blob, { contentType: 'image/jpeg', upsert: true }); 
        if(error) return base64Str; 
        return supabaseClient.storage.from('nextway-assets').getPublicUrl(filename).data.publicUrl; 
    } catch(e) { 
        return base64Str; 
    }
};
