# Návod na spuštění aplikace Slovíčka 🚀

Tento projekt je postaven na moderním React Native (Expo). Problémy se síťovým připojením k mobilnímu telefonu (kdy Windows používá virtuální sítě) jsme vyřešili pomocí chytrého spouštěcího skriptu.

## Jak aplikaci spustit (Krok za krokem)

1. Otevři terminál ve VS Code.
2. Pokud nejsi ve složce `test-app`, musíš do ní přejít příkazem:
   ```bash
   cd test-app
   ```
3. Spusť aplikaci příkazem:
   ```bash
   npm run wifi
   ```
   *Tento příkaz sám detekuje tvou aktuální IP adresu na Wi-Fi a aplikaci přes ni bezpečně spustí. Nemusíš tak řešit, jestli ti router změnil IP.*

4. Na telefonu otevři aplikaci **Expo Go** a naskenuj QR kód, který se ti ukáže v terminálu.

### Tip: Promazání paměti (pokud aplikace padá nebo nevidíš změny)
Pokud bys přidával nové složité balíčky nebo by aplikace při startu zlobila a padala do červené obrazovky, spusť to s parametrem na pročištění paměti (cache):
```bash
npm run wifi -- -c
```

---
*Vytvořeno automaticky jako tahák pro snazší vývoj!*
