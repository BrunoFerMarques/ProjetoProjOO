/**
 * Singleton de configuração global da aplicação.
 */
export class ConfiguracaoApp {
  private static instance: ConfiguracaoApp | undefined;

  private constructor(public nomeCampus: string) {}

  static getInstance(): ConfiguracaoApp {
    if (!ConfiguracaoApp.instance) {
      ConfiguracaoApp.instance = new ConfiguracaoApp("Campus Padrão");
    }
    return ConfiguracaoApp.instance;
  }

  static configurar(opcoes: { nomeCampus?: string }): ConfiguracaoApp {
    const base = ConfiguracaoApp.getInstance();
    ConfiguracaoApp.instance = new ConfiguracaoApp(
      opcoes.nomeCampus ?? base.nomeCampus
    );
    return ConfiguracaoApp.instance;
  }
}
