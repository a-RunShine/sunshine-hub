package com.sunshinefps;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

@AnalyzeClasses(packages = "com.sunshinefps", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule modules_are_free_of_cycles =
            SlicesRuleDefinition.slices()
                    .matching("com.sunshinefps.(*)..")
                    .should()
                    .beFreeOfCycles();

    @ArchTest
    static final ArchRule controllers_never_touch_repositories =
            noClasses()
                    .that()
                    .haveSimpleNameEndingWith("Controller")
                    .should()
                    .dependOnClassesThat()
                    .haveSimpleNameEndingWith("Repository");

    @ArchTest
    static final ArchRule catalog_never_depends_on_trade =
            noClasses()
                    .that()
                    .resideInAPackage("com.sunshinefps.catalog..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("com.sunshinefps.trade..");

    @ArchTest
    static final ArchRule identity_surface_is_facade_and_api = onlyFacadeAndApiVisible("identity");

    @ArchTest
    static final ArchRule catalog_surface_is_facade_and_api = onlyFacadeAndApiVisible("catalog");

    @ArchTest
    static final ArchRule trade_surface_is_facade_and_api = onlyFacadeAndApiVisible("trade");

    @ArchTest
    static final ArchRule content_surface_is_facade_and_api = onlyFacadeAndApiVisible("content");

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
