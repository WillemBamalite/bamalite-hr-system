import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

type ActionButtonProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
};

function ActionButton({ title, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function SnelleActiesScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snelle Acties</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          <ActionButton
            title="Nieuw Bemanningslid"
            onPress={() => router.push('/nieuw-personeel')}
          />
          <ActionButton
            title="Kandidaat toevoegen"
            onPress={() => router.push('/nieuw-personeel')}
          />

          <ActionButton
            title="Aflosser toevoegen"
            onPress={() => router.push('/aflossers')}
          />
          <ActionButton
            title="Student toevoegen"
            onPress={() => router.push('/studenten')}
          />

          <ActionButton
            title="Nieuwe ziekmelding"
            onPress={() => router.push('/ziekte')}
          />
          <ActionButton
            title="Nieuwe Taak toevoegen"
            onPress={() => router.push('/taken')}
          />

          <ActionButton
            title="Nieuw Scheepsbezoek"
            onPress={() => router.push('/scheepsbezoeken')}
          />
          <ActionButton
            title="Nieuwe Lening"
            onPress={() => router.push('/leningen')}
          />
        </View>

        <Text style={styles.helperText}>
          Deze knoppen openen de bijbehorende pagina&apos;s. We kunnen stap voor stap
          aparte invoerformulieren in de app toevoegen, zodat je hier straks direct nieuwe
          registraties kunt aanmaken.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#455A9C',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#020617',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  actionButton: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  helperText: {
    marginTop: 24,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});



