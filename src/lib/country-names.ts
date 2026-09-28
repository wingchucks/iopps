// Country names and common abbreviations, used only to flag a directory location for a
// person to check. Some Canadian communities share a country's name (Togo, SK; Jordan, ON),
// so a match must never block a listing on its own.
const COUNTRIES = "Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cape Verde|Cambodia|Cameroon|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo|Costa Rica|Cote d'Ivoire|Ivory Coast|Croatia|Cuba|Cyprus|Czechia|Czech Republic|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hong Kong|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Macau|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey|Turkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|UAE|Emirates|United Kingdom|UK|Great Britain|Britain|England|Scotland|Wales|Northern Ireland|United States|United States of America|USA|US|America|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe|KSA";

const key = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\./g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/^the /, "");

const BY_KEY = new Map(COUNTRIES.split("|").map(name => [key(name), name]));

/** The country a place name spells out exactly, such as "uae" or "U.S.A.", or null. */
export function countryNamed(value: unknown): string | null {
  return typeof value === "string" ? BY_KEY.get(key(value)) ?? null : null;
}
