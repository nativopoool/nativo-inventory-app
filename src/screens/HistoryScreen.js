import React from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, 
  StyleSheet, Modal 
} from 'react-native';
import { BRAND, RADIUS } from '../constants/brand';
import { MeButton } from '../components/MeButton';

export const HistoryScreen = ({ 
  visible = true, 
  onClose, 
  history, 
  onClear, 
  selectedEntry, 
  setSelectedEntry,
  embedded = false,  // When true: renders inline (no Modal wrapper)
}) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => setSelectedEntry(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon || '📦'}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.sku}>SKU: {item.sku}</Text>
        <Text style={styles.price}>${item.price?.toLocaleString() || '0'}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
      </View>
      <View style={styles.badgeContainer}>
        <View style={[
          styles.badge, 
          { backgroundColor: item.action === 'add' ? BRAND.success + '22' : BRAND.danger + '22' }
        ]}>
          <Text style={[
            styles.badgeText, 
            { color: item.action === 'add' ? BRAND.success : BRAND.danger }
          ]}>
            {item.action === 'add' ? `+${item.qty}` : `-${item.qty}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const content = (
    <View style={styles.container}>
      {/* Only show header controls (count + clear) when embedded — no close button needed as tab handles nav */}
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.title}>📋 Historial</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={styles.emptyText}>No hay registros aún</Text>
            <Text style={styles.emptySubText}>Los escaneos aparecerán aquí</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <MeButton 
          title="Limpiar Historial" 
          onPress={onClear} 
          type="danger"
          leftIcon="🗑️"
          size="sm"
        />
      </View>

      {/* Detail Modal — always a modal on top */}
      <Modal visible={!!selectedEntry} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedEntry && (
              <>
                <Text style={styles.modalTitle}>{selectedEntry.icon} Detalles</Text>
                <Text style={styles.field}><Text style={styles.bold}>Producto: </Text>{selectedEntry.name}</Text>
                <Text style={styles.field}><Text style={styles.bold}>SKU: </Text>{selectedEntry.sku}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Acción: </Text>{selectedEntry.mode}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Stock Previo: </Text>{selectedEntry.stockBefore}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Movimiento: </Text>{selectedEntry.action === 'add' ? '+' : '-'}{selectedEntry.qty}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Nuevo Stock: </Text>{selectedEntry.stockAfter}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Precio (IVA Inc.): </Text>${selectedEntry.price?.toLocaleString() || '0'}</Text>
                <Text style={styles.field}><Text style={styles.bold}>Fecha: </Text>{new Date(selectedEntry.date).toLocaleString()}</Text>
                
                <MeButton 
                  title="Cerrar" 
                  onPress={() => setSelectedEntry(null)} 
                  style={{ marginTop: 20 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );

  if (embedded) return content;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: BRAND.text,
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: BRAND.text,
    fontSize: 18,
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: BRAND.darkCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 22,
  },
  details: {
    flex: 1,
  },
  name: {
    color: BRAND.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  sku: {
    color: BRAND.muted,
    fontSize: 12,
  },
  price: {
    color: BRAND.success,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  date: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
  },
  badgeContainer: {
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: BRAND.muted,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    color: BRAND.muted,
    fontSize: 12,
    opacity: 0.6,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  clearBtn: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: BRAND.darkCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: BRAND.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    color: BRAND.text,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: BRAND.muted,
  },
});
