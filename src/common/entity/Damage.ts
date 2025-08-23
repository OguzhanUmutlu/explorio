import {Entity} from "@/entity/Entity";

export abstract class Damage {
    readonly finalDamage: number;

    protected constructor(public entity: Entity, public damage: number) {
        this.finalDamage = this.getFinalDamage();
    };

    getEPF() {
        return this.entity.getGenericProtectionLevel();
    };

    getFinalDamage(damage = this.damage) {
        const armor = this.entity.getArmorPoints();
        const toughness = this.entity.getArmorToughness();
        const armorFactor = Math.min(20, Math.max(armor / 5, armor - (4 * damage) / (toughness + 8)));
        damage *= 1 - armorFactor / 25;
        damage *= 1 - (Math.min(this.getEPF(), 20) * 4) / 100;
        damage *= 1 - Math.min(1, this.entity.resistanceLevel * 0.2);

        if (damage < 0) return 0;

        if (this.entity.invincible) return 0;

        // todo: if (this.entity.shield && this.entity.shield.blockDamage(damage)) return 0;

        return damage;
    };
}