/**
 * 鸣潮伤害计算器
 * 总伤害公式: 总攻击 * 倍率 * (1 + 属性伤害加成 + 技能伤害加成) * 暴击伤害
 */

export default class DamageCalculator {
    constructor(roleDetail) {
        this.roleDetail = roleDetail;
        this.attributes = this.parseAttributes();
    }

    /**
     * 解析角色属性
     */
    parseAttributes() {
        const attrList = this.roleDetail.roleAttributeList || [];
        const attrs = {};
        
        attrList.forEach(attr => {
            let value = attr.attributeValue;
            if (typeof value === 'string' && value.includes('%')) {
                value = parseFloat(value.replace('%', '')) / 100;
            } else {
                value = parseFloat(value) || 0;
            }
            
            // 使用属性名作为key
            const nameMap = {
                '生命': 'hp',
                '攻击': 'atk',
                '防御': 'def',
                '暴击': 'critRate',
                '暴击伤害': 'critDmg',
                '共鸣效率': 'energyRegen',
                '共鸣技能伤害加成': 'skillDmg',
                '共鸣解放伤害加成': 'liberationDmg',
                '普攻伤害加成': 'normalDmg',
                '重击伤害加成': 'heavyDmg',
                '热熔伤害加成': 'fireDmg',
                '冷凝伤害加成': 'iceDmg',
                '导电伤害加成': 'thunderDmg',
                '气动伤害加成': 'aeroDmg',
                '衍射伤害加成': 'spectroDmg',
                '湮灭伤害加成': 'havocDmg',
            };
            
            const key = nameMap[attr.attributeName];
            if (key) {
                attrs[key] = value;
            }
        });

        return attrs;
    }

    /**
     * 获取属性伤害加成
     */
    getElementDmgBonus(element) {
        const elementMap = {
            '热熔': 'fireDmg',
            '冷凝': 'iceDmg',
            '导电': 'thunderDmg',
            '气动': 'aeroDmg',
            '衍射': 'spectroDmg',
            '湮灭': 'havocDmg',
        };
        
        const key = elementMap[element] || 'aeroDmg';
        return this.attributes[key] || 0;
    }

    /**
     * 获取技能伤害加成
     */
    getSkillDmgBonus(skillType) {
        const skillMap = {
            'normal': 'normalDmg',
            'heavy': 'heavyDmg',
            'skill': 'skillDmg',
            'liberation': 'liberationDmg',
        };

        const key = skillMap[skillType] || 'skillDmg';
        return this.attributes[key] || 0;
    }

    /**
     * 计算期望伤害
     */
    calculateExpectedDamage(options) {
        const {
            multiplier = 1,
            element = '气动',
            skillType = 'skill',
        } = options;

        const atk = this.attributes.atk || 0;
        const critRate = Math.min(this.attributes.critRate || 0, 1);
        const critDmg = this.attributes.critDmg || 0.5;
        const elementBonus = this.getElementDmgBonus(element);
        const skillBonus = this.getSkillDmgBonus(skillType);

        // 总伤害 = 总攻击 * 倍率 * (1 + 属性伤害加成 + 技能伤害加成) * 暴击期望
        const dmgBonus = 1 + elementBonus + skillBonus;
        const critExpect = 1 + (critRate * critDmg);
        
        return Math.floor(atk * multiplier * dmgBonus * critExpect);
    }

    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(2) + '万';
        }
        return num.toLocaleString();
    }

    /**
     * 生成伤害报告
     */
    generateDamageReport() {
        const role = this.roleDetail.role || {};
        const roleName = role.roleName || '未知';
        const element = role.attributeName || '气动';

        const report = {
            roleName,
            element,
            attributes: {
                atk: Math.floor(this.attributes.atk || 0),
                critRate: ((this.attributes.critRate || 0) * 100).toFixed(1) + '%',
                critDmg: ((this.attributes.critDmg || 0.5) * 100).toFixed(1) + '%',
                elementBonus: ((this.getElementDmgBonus(element) || 0) * 100).toFixed(1) + '%',
            },
            damages: []
        };

        // 通用伤害计算
        const skills = [
            { name: '普攻 (100%)', multiplier: 1.0, type: 'normal' },
            { name: '重击 (200%)', multiplier: 2.0, type: 'heavy' },
            { name: '共鸣技能 (300%)', multiplier: 3.0, type: 'skill' },
            { name: '共鸣解放 (500%)', multiplier: 5.0, type: 'liberation' },
        ];

        skills.forEach(skill => {
            const dmg = this.calculateExpectedDamage({
                multiplier: skill.multiplier,
                element,
                skillType: skill.type
            });
            report.damages.push({
                name: skill.name,
                value: this.formatNumber(dmg),
                rawValue: dmg,
                type: skill.type
            });
        });

        return report;
    }
}