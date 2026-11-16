package com.sunshinefps;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
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

    // 一、模块之间不得成环。trade → catalog 是允许的，反向不允许，见下面第四条。

    @ArchTest
    static final ArchRule modules_are_free_of_cycles =
            SlicesRuleDefinition.slices()
                    .matching("com.sunshinefps.(*)..")
                    .should()
                    .beFreeOfCycles();

    // 二、Controller 不得直接依赖 Repository，中间必须隔一层 Facade。

    @ArchTest
    static final ArchRule controllers_never_touch_repositories =
            noClasses()
                    .that()
                    .haveSimpleNameEndingWith("Controller")
                    .should()
                    .dependOnClassesThat()
                    .haveSimpleNameEndingWith("Repository");

    // 三、catalog 不得依赖 trade。商品不该知道怎么下单，否则交易规则会污染商品模块。

    @ArchTest
    static final ArchRule catalog_never_depends_on_trade =
            noClasses()
                    .that()
                    .resideInAPackage("com.sunshinefps.catalog..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("com.sunshinefps.trade..");

    // 四、模块外部只能依赖 Facade 与 api 包。模块包下既不在 .api 里、也不是模块根包 *Facade 的类，
    // 一律算模块私有，外面不该看见。四条，每个模块一条。internal 也落在这一条里。

    @ArchTest
    static final ArchRule identity_surface_is_facade_and_api = onlyFacadeAndApiVisible("identity");

    @ArchTest
    static final ArchRule catalog_surface_is_facade_and_api = onlyFacadeAndApiVisible("catalog");

    @ArchTest
    static final ArchRule trade_surface_is_facade_and_api = onlyFacadeAndApiVisible("trade");

    @ArchTest
    static final ArchRule content_surface_is_facade_and_api = onlyFacadeAndApiVisible("content");

    // 五、domain 是纯业务规则，不得依赖框架。分两条：Spring 一条，持久化与消息一条。
    // 混在一条里报错时看不出是 Web 注解还是 Mapper 漏进来了。

    @ArchTest
    static final ArchRule domain_is_free_of_spring =
            noClasses()
                    .that()
                    .resideInAPackage("com.sunshinefps.*.domain..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("org.springframework..");

    @ArchTest
    static final ArchRule domain_is_free_of_infrastructure =
            noClasses()
                    .that()
                    .resideInAPackage("com.sunshinefps.*.domain..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAnyPackage(
                            "com.baomidou..",
                            "org.apache.ibatis..",
                            "redis.clients..",
                            "io.lettuce..",
                            "org.apache.rocketmq..");

    private static ArchRule onlyFacadeAndApiVisible(String module) {
        final String modulePackage = "com.sunshinefps." + module;
        final String apiPackage = modulePackage + ".api";
        DescribedPredicate<JavaClass> modulePrivate =
                DescribedPredicate.describe(
                        "reside in "
                                + modulePackage
                                + " but neither in "
                                + apiPackage
                                + " nor a *Facade at module root",
                        javaClass -> {
                            String packageName = javaClass.getPackageName();
                            boolean inModule =
                                    packageName.equals(modulePackage)
                                            || packageName.startsWith(modulePackage + ".");
                            boolean inApi =
                                    packageName.equals(apiPackage)
                                            || packageName.startsWith(apiPackage + ".");
                            boolean isFacadeAtRoot =
                                    packageName.equals(modulePackage)
                                            && javaClass.getSimpleName().endsWith("Facade");
                            return inModule && !inApi && !isFacadeAtRoot;
                        });
        return noClasses()
                .that()
                .resideOutsideOfPackage(modulePackage + "..")
                .should()
                .dependOnClassesThat(modulePrivate);
    }
}
