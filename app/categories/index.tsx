import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategories } from '../../lib/data';
import { colors, fonts } from '../../lib/theme';

export default function Categories() {
  const insets = useSafeAreaInsets();
  const categories = getCategories();

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      data={categories}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() =>
            router.push({ pathname: '/names', params: { category: item.name } })
          }
        >
          <Text style={styles.rowLabel}>{item.name}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.rowCount}>{item.count}</Text>
            <Text style={styles.rowArrow}>→</Text>
          </View>
        </Pressable>
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
          <Text style={styles.title}>Категории</Text>
          <Text style={styles.sub}>
            Жизненные темы из указателя книги — что вас беспокоит
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentDim,
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 22,
    color: colors.parchment,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.parchmentDim,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  rowPressed: {
    backgroundColor: colors.veil,
  },
  rowLabel: {
    fontFamily: fonts.displayRuBold,
    fontSize: 15,
    color: colors.parchment,
    flex: 1,
    marginRight: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.thread,
    backgroundColor: colors.threadSoft,
    borderColor: colors.threadBorder,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  rowArrow: {
    fontSize: 15,
    color: colors.parchmentDim,
  },
});
