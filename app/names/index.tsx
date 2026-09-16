import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { HomeButton } from '../../components/HomeButton';
import { NameRow } from '../../components/NameRow';
import { useScreenPadding } from '../../lib/safe-area';
import { NAMES, getNamesByCategory } from '../../lib/data';
import { colors, fonts, type } from '../../lib/theme';
import { ScreenTransition } from '../../components/ScreenTransition';

export default function AllNames() {
  const padding = useScreenPadding();
  const { category } = useLocalSearchParams<{ category?: string }>();

  const list = category ? getNamesByCategory(category) : NAMES;

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.content, padding]}
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NameRow name={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <HomeButton />
            <Text style={styles.title}>{category ? category : 'Все имена'}</Text>
            <Text style={styles.sub}>
              {list.length} {category ? 'имя' : 'имени · по порядку книги'}
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
    marginBottom: 10,
  },
});
