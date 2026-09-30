type Option = { id: string; name: string; isActive: boolean };
export default function CoverageFields({ cities, services, cityIds = [], serviceIds = [] }: {
  cities: Option[]; services: Option[]; cityIds?: string[]; serviceIds?: string[];
}) {
  return <div className="grid gap-4 sm:grid-cols-2">{[
    { label: "Cities served", name: "cityIds[]", options: cities, selected: cityIds },
    { label: "Services provided", name: "serviceIds[]", options: services, selected: serviceIds },
  ].map(group => <fieldset key={group.name} className="space-y-2">
    <legend className="font-bold">{group.label}</legend><input type="hidden" name={group.name} value="" />
    {group.options.map(option => <label key={option.id} className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={group.name} value={option.id} defaultChecked={group.selected.includes(option.id)} />
      {option.name}{!option.isActive ? " (inactive)" : ""}
    </label>)}
    {!group.options.length ? <p>No options available. Contact an operator.</p> : null}
  </fieldset>)}</div>;
}
