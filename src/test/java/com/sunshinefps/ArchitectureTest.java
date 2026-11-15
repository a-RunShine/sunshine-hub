package com.sunshinefps;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

/**
 * 架构边界，随 {@code mvn test} 执行。
 *
 * <p>这些规则的价值全在「真的跑了」这件事上。Spring Boot 3.5.3 默认带的 Surefire 有个回归，字段声明的 {@code @ArchTest} 不执行，
 * 构建照样绿但报告里 {@code Tests run: 0}。所以本项目的 Surefire 已 pin 到 3.5.2，验收时看测试数量，不看构建颜色。
 *
 * <p>新增模块时，照着现有规则各加一条。
 */
@AnalyzeClasses(packages = "com.sunshinefps", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    // 一、internal 包对模块外不可见。四条，每个模块一条。

    @ArchTest static final ArchRule identity_internals_are_hidden = internalsHidden("identity");

    @ArchTest static final ArchRule catalog_internals_are_hidden = internalsHidden("catalog");

    @ArchTest static final ArchRule trade_internals_are_hidden = internalsHidden("trade");

    @ArchTest static final ArchRule content_internals_are_hidden = internalsHidden("content");

    // 二、模块之间不得成环。trade → catalog 是允许的，反向不允许，见下面第五条。

    @ArchTest
    static final ArchRule modules_are_free_of_cycles =
            SlicesRuleDefinition.slices()
                    .matching("com.sunshinefps.(*)..")
                    .should()
                    .beFreeOfCycles();

    // 三、Controller 不得直接依赖 Repository，中间必须隔一层 Facade。

    @ArchTest
    static final ArchRule controllers_never_touch_repositories =
            noClasses()
                    .that()
                    .haveSimpleNameEndingWith("Controller")
                    .should()
                    .dependOnClassesThat()
                    .haveSimpleNameEndingWith("Repository");

    // 四、catalog 不得依赖 trade。商品不该知道怎么下单，否则交易规则会污染商品模块。

    @ArchTest
    static final ArchRule catalog_never_depends_on_trade =
            noClasses()
                    .that()
                    .resideInAPackage("com.sunshinefps.catalog..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("com.sunshinefps.trade..");

    // 五、模块外部只能依赖 Facade 与 api 包。internal 与 domain 都是模块私有，外面不该看见。
    // 四条，每个模块一条。

    @ArchTest
    static final ArchRule identity_surface_is_facade_and_api = onlyFacadeAndApiVisible("identity");

    @ArchTest
    static final ArchRule catalog_surface_is_facade_and_api = onlyFacadeAndApiVisible("catalog");

    @ArchTest
    static final ArchRule trade_surface_is_facade_and_api = onlyFacadeAndApiVisible("trade");

    @ArchTest
    static final ArchRule content_surface_is_facade_and_api = onlyFacadeAndApiVisible("content");

    private static ArchRule internalsHidden(String module) {
        return noClasses()
                .that()
                .resideOutsideOfPackage("com.sunshinefps." + module + "..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage("com.sunshinefps." + module + ".internal..");
    }

    private static ArchRule onlyFacadeAndApiVisible(String module) {
        return noClasses()
                .that()
                .resideOutsideOfPackage("com.sunshinefps." + module + "..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(
                        "com.sunshinefps." + module + ".internal..",
                        "com.sunshinefps." + module + ".domain..");
    }
}
