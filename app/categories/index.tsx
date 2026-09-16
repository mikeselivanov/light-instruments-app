import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HomeButton } from '../../components/HomeButton';
import { tappable } from '../../lib/interaction';
import { useScreenPadding } from '../../lib/safe-area';
import { getCategories } from '../../lib/data';
import { colors, fonts, type } from '../../lib/theme';
import { ScreenTransition } from '../../components/ScreenTransition';

export default function Categories() {
  const padding = useScreenPadding();
  const categories = getCategories();

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.content, padding]}
        data={categories}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, tappable, pressed && styles.rowPressed]}
            onPress={() =>
              router.replace({ pathname: '/names', params: { category: item.name } })
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
            <HomeButton />
            <Text style={styles.title}>Категории</Text>
            <Text style={styles.sub}>
              Жизненные темы из указателя книги — что вас беспокоит
            </Text>
          </View>
        }
      />
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginBottom: 12,
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
    ...type.rowTitle,
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
    ...type.tag,
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
    fontSize: 17,
    color: colors.parchmentDim,
  },
});
